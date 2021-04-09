// Code inspired on https://observablehq.com/@kerryrodden/sequences-sunburst


// Input is a list of sequence-count tuples
// Sequence: separated by ';'
// count: int

var SeqSunburst = function(unformattedData, width, selector) {
    const data = unformattedData;
    const separator = ";";
    var root;
    var fields;
    const radius = width/2;
    // var graph = function() { return this; };
    // Arcs
    var arc;
    var mousearc;
    // Color palette
    const colors = [
        "#eddcd2",
        "#fff1e6",
        "#fde2e4",
        "#fad2e1",
        "#acc8c1",
        "#bedad9",
        "#d7eae4",
        "#bcd4e6",
        "#99c1de",
        "#82a8c4"
    ];
    var palette;

    // Draw graph
    var sunburst = buildGraph();
    if (selector)
        graph.draw(selector)

    // Converts data to hierarchical format
    function buildHierarchy(unfData) {
      const root = { name: "root", children: [] };
      for (let i = 0; i < unfData.length; i++) {
        const sequence = unfData[i][0];
        const size = +unfData[i][1];
        if (isNaN(size)) {
          // e.g. if this is a header row
          continue;
        }
        const parts = sequence.split(separator);
        let currentNode = root;
        for (let j = 0; j < parts.length; j++) {
          const children = currentNode["children"];
          const nodeName = parts[j];
          let childNode = null;
          if (j + 1 < parts.length) {
            // Not yet at the end of the sequence; move down the tree.
            let foundChild = false;
            for (let k = 0; k < children.length; k++) {
              if (children[k]["name"] == nodeName) {
                childNode = children[k];
                foundChild = true;
                break;
              }
            }
            // If we don't already have a child node for this branch, create it.
            if (!foundChild) {
              childNode = { name: nodeName, children: [] };
              children.push(childNode);
            }
            currentNode = childNode;
          } else {
            // Reached the end of the sequence; create a leaf node.
            childNode = { name: nodeName, value: size };
            children.push(childNode);
          }
        }
      }
      return root;
    }

    // Creates root and finishes formatting data
    function buildRoot() {
        let formattedData = buildHierarchy(data)
        // Formats data to draw graph
        let partition = data =>
          d3.partition().size([2 * Math.PI, radius * radius])(
            d3.hierarchy(data)
              .sum(d => d.value)
              .sort((a, b) => b.value - a.value)
          )
        root = partition(formattedData);
    }

    function buildFields() {
        unfFields = []
        data.forEach(d => {
            const seq = d[0].split(separator)
            unfFields.append(seq)
        })
        fields = d3.set(unfFields).keys();
    }

    function buildScales() {
        arc = d3.arc()
          .startAngle(d => d.x0)
          .endAngle(d => d.x1)
          .padAngle(1 / radius)
          .padRadius(radius)
          .innerRadius(d => Math.sqrt(d.y0))
          .outerRadius(d => Math.sqrt(d.y1) - 1);
        mousearc = d3.arc()
          .startAngle(d => d.x0)
          .endAngle(d => d.x1)
          .innerRadius(d => Math.sqrt(d.y0))
          .outerRadius(radius);
        // Color palette
        palette = d3.scaleOrdinal()
          .domain(fields)
          .range(colors);
    }

    function buildGraph() {
        buildFields();
        buildRoot();
        buildScales();
        const svg = d3.create("svg");
        // Make this into a view, so that the currently
        // hovered sequence is available to the breadcrumb
        const element = svg.node();
        element.value = { sequence: [], percentage: 0.0 };

        // Center label
        const label = svg
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", "#888")
        label
            .append("tspan")
            .attr("class", "percentage")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "-0.1em")
            .attr("font-size", "3em")
            .text("");
        label
            .append("tspan")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "1.5em")
            .text("of visits begin with this sequence");
        // Main svg
        svg
            .attr("viewBox", `${-radius} ${-radius} ${width} ${width}`)
            .style("max-width", `${width}px`)
            .style("font", "12px sans-serif");
        // Paths
        const path = svg
            .append("g")
            .selectAll("path")
            // Don't draw the root node, and for efficiency,
            // filter out nodes that would be too small to see
            .data(root.descendants()
                .filter(d => d.depth && d.x1 - d.x0 > 0.001))
            .join("path")
            .attr("fill", d => palette(d.data.name))
            .attr("d", arc);
        svg
            .append("g")
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseleave", () => {
              path.attr("fill-opacity", 1);
              label.style("visibility", "hidden");
              // Update the value of this view
              element.value = { sequence: [], percentage: 0.0 };
              element.dispatchEvent(new CustomEvent("input"));
            })
            .selectAll("path")
            // Don't draw the root node, and for efficiency,
            // filter out nodes that would be too small to see
            .data(root.descendants()
                .filter(d => d.depth && d.x1 - d.x0 > 0.001))
            .join("path")
            .attr("d", mousearc)
            .on("mouseenter", (_, d) => {
                // Get the ancestors of the current segment, minus the root
                const sequence = d
                    .ancestors()
                    .reverse()
                    .slice(1);
                // Highlight the ancestors
                path.attr("fill-opacity", node =>
                    sequence.indexOf(node) >= 0 ? 1.0 : 0.3);
                const percentage = ((100 * d.value) / root.value).toPrecision(3);
                label
                    .style("visibility", null)
                    .select(".percentage")
                    .text(percentage + "%");
                // Update the value of this view with
                // the currently hovered sequence and percentage
                element.value = { sequence, percentage };
                element.dispatchEvent(new CustomEvent("input"));
            });

        return element;
    }

    graph.draw = function(selector) {
        d3.select(selector)
            .append(sunburst);
    }
}
