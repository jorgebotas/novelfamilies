API_BASE_URL = "/api"
STATIC_URL = "/static/geco"

var get_newick = async (query) => {
    let newick;
    await fetch(API_BASE_URL + '/newick/' + query + '/')
         .then(response => response.text())
         .then(tree => newick = tree)
         .catch(e => console.log(e))
    return newick;
}

var get_context = async (query) => {
    let context;
    await fetch(API_BASE_URL + '/context/'+ query + '/')
        .then(response => response.json())
         .then(data => context = eval(data.context))
         .catch(e => console.log(e));
    return context;
}

var get_colors = async () => {
    let colors;
    await fetch(STATIC_URL + '/txt/colors.txt/')
          .then(response => response.text())
          .then(data => colors = eval(data))
          .catch(e => console.log(e));
    return colors;
}

var draw_protDomains = function(id, domains, lenseq, width, height, palette) {
    function scale(num, inSize, outSize) {
        return +num * outSize / inSize;
    }
    function draw_seqLine(g, width, height) {
        g.append("line")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("x1", 0)
            .attr("y1", height / 2)
            .attr("x2", width)
            .attr("y2", height / 2);
    }
    function draw_legend(selector, domains, palette) {
        var legend = d3.select(selector)
         .append("div")
         .attr("class", "d-inline px-3");
        var doms = new Set();
        domains.forEach(d => {
            if (d.class && d.class != "") {
                doms.add(d.class)
            }
        })
        doms.forEach(d => {
            let l = legend.append("div")
                     .attr('class', 'd-inline px-2');
            l.append('svg')
             .attr('width', 10)
             .attr('height', 10)
             .attr('class', 'mr-2')
             .append('circle')
             .attr("r", 5)
             .attr("cx", 5)
             .attr("cy", 5)
             .attr("fill", palette(d));
            l.append('div')
             .attr('class', 'd-inline')
             .text(d)
        })
    }
    function draw_domains(g, domains, lenseq, width, height, palette) {
        g.selectAll('circle')
            .data(domains.filter(d => d.shape == "circle" ))
            .enter().append('circle')
            .attr("r", 4)
            .attr("cx", function (d) { return scale(+d.c, lenseq, width); })
            .attr("cy", height/2)
            .attr("fill", d => { return palette(d.class) });
        g.selectAll('rect')
            .data(domains.filter(d => d.shape == "rect" ))
            .enter().append('rect')
            .attr("x", function (d) {return scale(+d.start, lenseq, width); })
            .attr("y", 0)
            .attr("width", function (d) { return scale(+d.end - +d.start, lenseq, width); })
            .attr("height", height)
            .attr("fill", d => { return palette(d.class) });
    }
    var g = d3.select('#' + id)
              .append("div")
              .append('svg:svg')
              .attr("width", width)
              .attr("height", height)
              .append('svg:g')
                .attr("transform", "translate(" + 5 + ", 0)");
    draw_seqLine(g, width, height);
    draw_domains(g, domains, lenseq, width, height, palette);
    draw_legend('#' + id + ' div', domains, palette);
}

var drawDonuts = async function(f, data) {
    var biomes_id = 'f' + f + '-biomesViz';
    var biomes = data.biomes;
    var mags_id = 'f' + f + '-magsDonut';
    var mags = data.mags;
    var colors = ["#abfdcb",
                    "#c9b2fd",
                    "#fcaf81",
                    "#a9dff7",
                    "#254F93",
                    "#FF5C8D",
                    "#838383",
                    "#5F33FF",
                    "#c7e3aa",
                    "#D81E5B",
                    "#47DAFF",
                    "#c4ab77",
                    "#A1A314",
                    "#fff600"];
    renderDonut(biomes_id,
                [
                "Marine",
                "Human vagina",
                "Fresh water",
                "Soil",
                "Pig gut",
                "Mouse gut",
                "Built environment",
                "Human skin",
                "Human nose",
                "Dog gut",
                "Cat gut",
                "Human gut",
                "Waste water",
                "Human oral"
                ],
                Object.values(biomes),
                colors);
    renderDonut(mags_id,
                [
                "Human gut",
                "Marine",
                "TARA Eukaryote",
                "Earth",
                ],
                Object.values(mags).map(m => m.length),
                colors.slice(0, 4))
}

var renderDonut = function(id, labels, vals, colors) {
    let div = document.getElementById(id);
    options = {
        chart: {
            type: "donut",
            fontFamily: 'inherit',
            height: 240,
            sparkline: {
                enabled: true
            },
            animations: {
                enabled: false
            },
        },
        fill: {
            opacity: 1,
        },
        series: vals,
        labels : labels,
        grid: {
            strokeDashArray: labels.length,
        },
        colors: colors,
        legend: {
            show : 'bottom',
        },
        tooltip: {
            fillSeriesColor: false
        },
    }
    var chart = new ApexCharts(div, options);
    chart.render();

}

var renderDomains = function(domains) {
        document.querySelectorAll('.domains').forEach(div => {
            if (div.children.length > 0) {
                div.firstChild.remove();
            }
        })
        var doms = new Set();
        domains.forEach(d => {
            if (d.class && d.class != "") {
                doms.add(d.class)
            }
        })
        var colors = [
            '#6574cd',
            '#e6ac00',
            '#ffa3b2',
            "#254F93",
            "#c9b2fd",
            "#fcaf81",
            "#a9dff7",
            "#FF5C8D",
            "#838383",
            "#5F33FF",
            "#c7e3aa",
            "#abfdcb",
            "#D81E5B",
            "#47DAFF",
            "#c4ab77",
            "#A1A314",
            "#fff600",
            "#53257E",
            "#1e90ff",
            "#B6549A",
            "#7cd407",
            "#948ad6",
            "#7ba0d5",
            "#fcc6f8",
            "#fec24c",
            "#A40E4C",
            "#dd5a95",
            "#12982d",
            "#27bda9",
            "#F0736A",
            "#9354e7",
            "#cbd5e3",
            "#93605D",
            "#FFE770",
            "#6C9D7F",
            "#2c23e4",
            "#ff6200",
            "#406362"
              ]
        var palette = d3.scaleOrdinal()
                        .domain(doms)
                        .range(colors);
        domains.forEach(d => {
            selector = "d" + d.gene
            draw_protDomains(selector, d.doms, d.lenseq, 600, 10, palette);
        });
}

var gmgc_vueapp = new Vue({
    delimiters: ['[[', ']]'],
    el: '#NovelFams',
    data: {
        show_items: {},
    },
    methods: {
        toggleGeCoViz : async function(selector, query) {
                let newick, context;
                newick = this.show_items[query].newick;
                context = this.show_items[query].context;
                if (context) {
                    window.onload = async () => {
                        d3.select(selector)
                            .style('opacity', 1)
                            .style('visibility', 'visible');
                        await $(selector + " + div .gecoviz-progress").hide();
                    }
                } else {
                    await $(selector + " + div .gecoviz-progress").show();
                    console.log(selector)
                    newick = await get_newick(query);
                    context = await get_context(query);
                    let graph = GeCoViz(selector)
                                .data(context)
                                .nSide(10)
                                .showName("Gene name")
                                .notation("Orthologous groups", 2)
                                .tree(newick, undefined);
                    d3.select(selector)
                             .call(graph);
                    d3.select(selector)
                        .style('opacity', 1)
                        .style('visibility', 'visible');
                    //await window.launch_GeCo(selector, context, newick, 41, colors);
                    await $(selector + " + div .gecoviz-progress").hide();
                    this.show_items[query].newick = newick;
                    this.show_items[query].context = context;
                }
            },

        searchFams : function() {
            $("#search-fams").blur();
            $('.search-spinner').show();
            let query = $("#search-fams").val().trim();
            if (query.split("|").length > 1) {
                fetch(API_BASE_URL + `/info/${query}/`)
                .then(response => response.json())
                .then(data => {
                    this.show_items = {}
                    this.show_items = data.show_items
                })
                .then(() => {
                    Object.entries(this.show_items).forEach(([f, data]) => {
                        let idx = Object.keys(this.show_items).indexOf(f);
                        //drawDonuts(f, data);
                        //renderDomains(data.domains);
                        d3.selectAll('.GeCoViz').selectAll('*').remove();
                        this.toggleGeCoViz(`#f${idx}-GeCoViz`, f)
                    });
                    $('.tab-content').collapse('show');
                    $('.search-spinner').hide();
                })
            } else {
                this.searchFamByTaxa('#search-fams', '')
            }
        },

        searchFamByTaxa : function(selector, prefix) {
            $('.search-spinner').show();
            d3.selectAll('.GeCoViz').selectAll('*').remove();
            let search = $(selector);
            search.blur();
            let query = prefix + search.val().trim();
            let spec = document.querySelector("#specificity").noUiSlider.get();
            let cov = document.querySelector("#coverage").noUiSlider.get();
            fetch(API_BASE_URL + `/taxafams/${query}/${spec}/${cov}/`)
                .then(response => response.json())
                .then(data => {
                    this.show_items = {}
                    this.show_items = data.show_items
                })
                .then(() => {
                    this.hideAllFams();
                    $('.search-spinner').hide();
                })
        },

        showAllFams : function() {
            Object.keys(this.show_items).forEach((f, idx) => {
                this.toggleGeCoViz(`#f${idx}-GeCoViz`, f)
            });
            $('.tab-content').collapse('show');
        },

        hideAllFams : function() {
            $('.tab-content').collapse('hide');
        },

        toggleFam : function(id) {
            $("#" + id).collapse('show');
        },

    },
    filters : {
        filterBlank : function (value) {
            blank = [
                "OTHER",
                "",
                "NA"
            ]
            return blank.indexOf(value) > -1 ? value : "-";
        },
        toFixed : function (value) {
            return +(+value).toFixed(3);
        },
        getKeyByValue : function(value, object) {
            return Object.keys(object).find(key => object[key] === value);
        },
        getLen : function(domains, gene) {
            return domains.filter(d => d.gene == gene)[0].lenseq
        },

    },
});
