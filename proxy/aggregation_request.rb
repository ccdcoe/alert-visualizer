require 'http'

class AggregationRequest
  QUERY = {
    "query": {
          "bool": {
            "must": [
              {
                "range": {
                  "@timestamp": {
                    "gte": 0
                  }
                }
              }, {
                "query_string": {
                  "query": "event_type:alert AND alert.source.net_info:*",
                  "analyze_wildcard": true
                }
              }
            ]
          }
        },
          "aggs": {
          "src_ip": {
            "terms": {
              "field": "alert.source.ip.keyword",
              "size": 40,
              "order": {
                "_count": "desc"
              }
            },
            "aggs": {
              "net_src": {
                "terms": {
                  "field": "alert.source.net_info.keyword",
                  "size": 2,
                  "order": {
                    "_count": "desc"
                  }
             },
              "aggs": {
                "dest_ip": {
                  "terms": {
                    "field": "alert.target.ip.keyword",
                    "size": 40,
                    "order": {
                      "_count": "desc"
                    }
                  },
                "aggs": {
                  "net_dest": {
                    "terms": {
                      "field": "alert.target.net_info.keyword",
                      "size": 2,
                      "order": {
                        "_count": "desc"
                      }
                    },
                    "aggs": {
                      "alerts": {
                          "terms": {
                          "field": "alert.signature.keyword",
                          "size": 20,
                          "order": {
                              "_count": "desc"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  ENDPOINT = 'http://ELASTIC:9200/suricata-alert-*/_search'

  def initialize
    @nodes = []
    @ip_list = []
    @links = []
    @groups = Set.new
  end

  def perform
    @result = HTTP
      .headers(content_type: "application/json")
      .get(ENV.fetch('ES_ENDPOINT', ENDPOINT), body: QUERY.to_json).parse

    empty_result || parsed_result
  end

  private

  def empty_result
    return unless @result.dig('hits', 'total').zero?
    {
      error: "Invalid response from ElasticSearch"
    }
  end

  def parsed_result
    valid_sources.each do |src_ip|
      destination = src_ip
        .dig('net_src', 'buckets')
        .detect { |bucket| bucket["key"] != "Blue Team" }

      handle_source src_ip, destination
      handle_destinations src_ip, destination['dest_ip']['buckets']
    end

    {
      nodes: @nodes,
      links: @links,
      groups: @groups.to_a
    }
  end

  def valid_sources
    @result.dig('aggregations', 'src_ip', 'buckets')
      .select do |src_ip|
        src_ip.dig 'net_src', 'buckets', 0
      end
  end

  def handle_source(src_ip, destination)
    if @ip_list.include? src_ip['key']
      set_node_as_source src_ip['key']
    else
      @groups << destination['key']
      add_source_node src_ip['key'], destination['key']
    end
  end

  def handle_destinations(src_ip, dest_ips)
    dest_ips.each do |dest_ip|
      unless @ip_list.include? dest_ip['key']
        group = dest_ip
          .dig('net_dest', 'buckets')
          .detect { |bucket| bucket["key"] != "Blue Team" }
          .dig 'key'

          next unless group

        @groups << group
        add_destination_node dest_ip['key'], group
      end

      add_link src_ip, dest_ip
    end
  end

  def set_node_as_source(key)
    @nodes
      .select { |node| node['id'] == key }
      .each { |node| node['type'] = :source }
  end

  def add_node(ip, group, type)
    @nodes << { id: ip, group: @groups.to_a.index(group), type: :source }
    @ip_list << ip
  end

  def add_source_node(ip, group)
    add_node ip, group, :source
  end

  def add_destination_node(ip, group)
    add_node ip, group, :target
  end

  def add_link(src, dst)
    @links << {
      source: src['key'],
      target: dst['key'],
      value: (Math.log(dst['doc_count']) + 1) * 2,
      alerts: dst.dig('net_dest', 'buckets', 0, 'alerts', 'buckets')
    }
  end
end
