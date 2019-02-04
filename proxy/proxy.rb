require "bundler"
Bundler.setup(:default)

require "sinatra"

require_relative 'aggregation_request'

set :port, 4567

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
end

get '/' do
  response.headers['Content-Type'] = "application/json"
  AggregationRequest.new.perform.to_json.tap do |result|
    status 400 if result["error"]
  end
end