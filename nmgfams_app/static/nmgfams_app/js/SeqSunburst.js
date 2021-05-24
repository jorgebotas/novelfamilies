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
        "#82a8c4",
        "#99c1de",
        "#bcd4e6",
        "#acc8c1",
        "#bedad9",
        "#d7eae4",
        "#fad2e1",
        "#fde2e4",
        "#eddcd2",
        "#fff1e6"
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
            childNode = { name: nodeName, value: size, children: [] };
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

    function buildSunburst() {
        sunburst = container
            .append('svg')
            .attr('class', 'seq-sunburst')
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
        // Main svg
        sunburst
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
                breadcrumb.update([])
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
            });

        return sunburst;
    }

    function initGraph() {
        buildFields();
        buildRoot();
        buildScales();
    }

    graph.draw = function(selector) {
        container = d3.select(selector);
        container
            .append('div')
            .attr('class', 'breadcrumb-container')
            .style('width', '100%')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('margin-top', '20px')
        container = container
            .insert('div', '.breadcrumb-container')
            .attr('class', 'SeqSunburst-container')
            .style('width', '100%')
            .style('display', 'flex')
            .style('justify-content', 'center');
        breadcrumb = new BreadCrumb(selector + ' .breadcrumb-container',
            palette,
            {
                'd': 'domain',
                'p': 'phylum',
                'c': 'class',
                'o': 'order',
                'f': 'family',
                'g': 'genus',
                's': 'species'
            });
        buildSunburst();
        return graph;
    }

    initGraph();

    return graph;
}

var capitalize = function(string) {
    return string.trim().replace(/^\w/, c => c.toUpperCase());
}

class BreadCrumb {
    constructor(selector, palette, fields, seq, options = { showFields: true }) {
        // Polygon dimensions
        this.polygonWidth = 150;
        this.polygonHeight = 30;
        this.polygonPadding = 2;
        this.tipWidth = 10;
        this.fieldsHeight = options.showFields ? 17 : 0;
        this.palette = palette;
        this.seq;
        this.fields = fields;
        this.maxSeqLength = Object.keys(this.fields).length;
        this.container = d3.select(selector)
            .append('svg')
            .attr('class', 'BreadCrumb')
            .attr('width',
                this.maxSeqLength*this.polygonWidth
                + this.tipWidth
                + this.polygonPadding)
            .attr('height', this.polygonHeight + this.fieldsHeight);
        if (seq)
            this.update(seq)
    }

    // Generate a string that describes the points of a breadcrumb SVG polygon
    breadcrumbPoints(i) {
        //const x0 = this.polygonWidth * i + this.polygonPadding;
        //const x = this.polygonWidth * (i+1);
        const x0 = this.polygonPadding;
        const x = this.polygonWidth;
        const y0 = this.fieldsHeight;
        const y = y0 + this.polygonHeight;
        const points = [];
        points.push(`${x0}, ${y0}`);
        points.push(`${x}, ${y0}`);
        points.push(`${x + this.tipWidth}, ${y0 + this.polygonHeight / 2}`);
        points.push(`${x},${y }`);
        points.push(`${x0},${y}`);
        if (i > 0) {
            // Leftmost breadcrumb; don't include 6th vertex.
            points.push(`${x0 + this.tipWidth},${y0 + this.polygonHeight / 2}`);
        }
        return points.join(" ");
    }

    updatePolygons() {
        const breadcrumbs = this.container
            .selectAll('.breadcrumb-g')
            .data(this.seq, d => d.data.name);
        const breadcrumbsEnter = breadcrumbs
            .enter()
            .append('g')
            .attr('class', 'breadcrumb-g')
            .style('text-align', 'center')
            .attr('transform', (_, i) =>
                `translate(${this.polygonWidth*i}, 0)`);
        // Polygon
        breadcrumbsEnter
            .append('polygon')
            .attr('class', 'breadcrumb-polygon')
            .attr('fill', d => this.palette(d.data.name))
            .attr('points', (_, i) => this.breadcrumbPoints(i));
        // Text on polygon
        breadcrumbsEnter
            .append('text')
            .attr('class', 'breadcrumb-polygon-text')
            .text(d => d.data.name.slice(3))
            .attr('x', this.tipWidth + this.polygonWidth/2)
            .attr('y', this.fieldsHeight + this.polygonHeight/1.5)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', 'bold');
        // Text on top
        breadcrumbsEnter
            .append('text')
            .attr('class', 'breadcrumb-top-text')
            .text(d => capitalize(this.fields[d.data.name.slice(0, 1)]))
            .attr('x', this.tipWidth + this.polygonWidth/2)
            .attr('y', this.fieldsHeight - 5)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', 'bold');
        // Exit breadcrumbs
        breadcrumbs
            .exit()
            .remove();
    }

    update(seq) {
        this.seq = seq;
        this.updatePolygons();
    }
}
