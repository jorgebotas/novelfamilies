// Code inspired on https://observablehq.com/@kerryrodden/sequences-sunburst


// Input is a list of sequence-count tuples
// Sequence: separated by ';'
// count: int

var SeqSunburst = function(unformattedData, width) {
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
        "#82a8c4","#99c1de","#bcd4e6","#acc8c1","#bedad9","#d7eae4","#fad2e1","#fde2e4","#eddcd2","#fff1e6"
    ];
    var palette;

    var container;
    var sunburst;
    var breadcrumb;
    var graph = function() { return this };

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
            unfFields.push(...seq)
        })
        fields = [...new Set(unfFields)];
        console.log(fields)
        console.log(fields.length)
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

    function init() {
        buildFields();
        buildRoot();
        buildScales();
    }

    function buildSunburst() {
        //const svg = d3.create("svg");
        sunburst = container
            .append('svg')
            .attr('class', 'seq-sunburst')
        // Make this into a view, so that the currently
        // hovered sequence is available to the breadcrumb
        //const element = svg.node();
        //element.value = { sequence: [], percentage: 0.0 };

        // Center label
        const label = sunburst
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", "#888")
        label
            .append("tspan")
            .attr("class", "percentage")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "0.3em")
            .attr("font-size", "30px")
            .text("");
        //label
            //.append("tspan")
            //.attr("class", "sequence-type")
            //.attr("font-size", "15px")
            //.attr("x", 0)
            //.attr("y", 0)
            //.attr("dy", "1.5em")
        // Main svg
        svg
            .attr("viewBox", `${-radius} ${-radius} ${width} ${width}`)
            .style("max-width", `${width}px`)
            .style("font", "12px sans-serif");
        // Paths
        const path = sunburst
            .append("g")
            .selectAll("path")
            // Don't draw the root node, and for efficiency,
            // filter out nodes that would be too small to see
            .data(root.descendants()
                .filter(d => d.depth && d.x1 - d.x0 > 0.001))
            .join("path")
            .attr("fill", d => palette(d.data.name))
            .attr("d", arc);
        sunburst.append("g")
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseleave", () => {
                path.attr("fill-opacity", 1);
                label.style("visibility", "hidden");
              // Update the value of this view
              //element.value = { sequence: [], percentage: 0.0 };
              //element.dispatchEvent(new CustomEvent("input"));
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
                // Update breadcrumb
                breadcrumb.update(sequence)
                //label
                    //.select('.sequence-type')
                    //.text(d.data.name)
                // Update the value of this view with
                // the currently hovered sequence and percentage
                //element.value = { sequence, percentage };
                //element.dispatchEvent(new CustomEvent("input"));
            });

        return sunburst;
    }

    graph.draw = function(selector) {
        container = d3.select(selector);
        breadcrumb = BreadCrumb(selector, []);
        buildSunburst();
        return graph;
    }

    init();

    return graph;
}


class BreadCrumb {
    constructor(selector, seq) {
        this.container = d3.select(selector)
            .append('svg')
            .attr('class', 'BreadCrumb');
        this.seq = seq;
        this.breadcrumb;
        this.polygons;
    }

    // Generate a string that describes the points of a breadcrumb SVG polygon
    breadcrumbPoints(i) {
        const tipWidth = 10;
        const points = [];
        points.push("0,0");
        points.push(`${breadcrumbWidth},0`);
        points.push(`${breadcrumbWidth + tipWidth},${breadcrumbHeight / 2}`);
        points.push(`${breadcrumbWidth},${breadcrumbHeight}`);
        points.push(`0,${breadcrumbHeight}`);
        if (i > 0) {
            // Leftmost breadcrumb; don't include 6th vertex.
            points.push(`${tipWidth},${breadcrumbHeight / 2}`);
        }
        return points.join(" ");
    }

    updatePolygons() {
        this.polygons = this.container
            .selectAll('.breadcrumb-polygon')
            .data(this.seq, s => s.data.name)
        this.polygons
            .join('polygon')
            .attr('class', 'breadcrumb-polygon')
            .attr('fill', s => this.palette(s.data.name))
            .attr('points', (_, i) => this.breadcrumbPoints(i))
    }

    update(seq) {
        this.seq = seq;
        console.log(seq)
        updatePolygons();
    }
}
