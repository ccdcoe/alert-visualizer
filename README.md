# alert-visualizer
Display connected Suricata alerts over multiple networks. Powered by d3 and elasticsearch.

![alert!](/attack-viz-simple.PNG)

## Data format

Note that backing elastic aggregation expects this field to be present in addition to regular Suricata event fields.

```
...
          "net_info" : {
            "src" : [
              "Net 1",
              "Blue Team"
            ],
            "dest" : [
              "Net 2",
              "Blue Team"
            ]
          },
...
```
