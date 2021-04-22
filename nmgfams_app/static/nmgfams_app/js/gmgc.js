//import ApexCharts from 'apexcharts';
//import Vue from 'vue';
//import GeCoViz from 'gecoviz.js';
//import noUiSlider from 'nouislider';


var API_BASE_URL = "/api"
var STATIC_URL = "/static/geco"

//var colors = ["#abfdcb",
                //"#c9b2fd",
                //"#fcaf81",
                //"#a9dff7",
                //"#254F93",
                //"#FF5C8D",
                //"#838383",
                //"#5F33FF",
                //"#c7e3aa",
                //"#D81E5B",
                //"#47DAFF",
                //"#c4ab77",
                //"#A1A314",
                //"#fff600"];
var colors = [
    "#9c89b8",
    "#f0a6ca",
    "#b8bedd",
    "#6B9080",
    "#A4C3B2",
    "#CCE3DE"
];

var cleanString = function(s) {
    let clean = String(s);
    let dirt = " \t.,;:_/\\'@<>?()[]{}#%!*|".split("");
    dirt.forEach(d => {
        clean = clean.replaceAll(d, "");
    })
    return String(clean)
}

var get_newick = async (query) => {
    let newick;
    await fetch(API_BASE_URL + '/tree/' + query + '/')
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

var draw_protDomains = function(selector, domains, lenseq, width, height, palette) {
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
         .attr("class", "d-block px-3");
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
    var g = d3.select(selector)
              .append("div")
              .append('svg:svg')
              .attr("width", width)
              .attr("height", height)
              .append('svg:g')
                .attr("transform", "translate(" + 5 + ", 0)");
    draw_seqLine(g, width, height);
    draw_domains(g, domains, lenseq, width, height, palette);
    draw_legend(selector + ' div', domains, palette);
}

var drawDonuts = async function(f, data) {
    var biomes_id = 'f' + f + '-biomesViz';
    var biomes = data.biomes;
    var mags_id = 'f' + f + '-magsDonut';
    var mags = data.mags;
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

var renderDonut = function(id, labels, vals, colors, legend='bottom', height=240, width=450) {
    let div = document.getElementById(id);
    options = {
        chart: {
            type: "donut",
            fontFamily: 'inherit',
            width: width,
            height: height,
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
            show : legend,
        },
        tooltip: {
            fillSeriesColor: false
        },
        plotOptions: {
            pie: {
                expandOnClick: false,
            }
        }
    }
    var chart = new ApexCharts(div, options);
    chart.render();

}

var renderDomains = function(domains, outerSelector) {
    var doms = new Set();
    domains.forEach(dom => {
        dom.doms.forEach(d => {
            if (d.class && d.class != "")
                doms.add(d.class)
        })
    })
    doms = [...doms];
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
    if (doms.includes('helix'))
        doms = ['helix', ...doms.filter(d => d != 'helix')];
    else
        colors = colors.slice(1);
    var palette = d3.scaleOrdinal()
                    .domain(doms)
                    .range(colors);
    domains.forEach(d => {
        selector = outerSelector + " #d" + cleanString(d.gene);
        const container = d3.select(selector);
        container.selectAll('*').remove();
        if (d.doms.length > 0)
            draw_protDomains(selector, d.doms, d.lenseq, 600, 10, palette);
    });
}

var renderSunburst = function(selector, data) {
    SeqSunburst(data, 200, selector);
}

var fetchCatch = function(e) {
    console.log(e)
    alert("No family found under current search. Please try again!")
}

var gmgc_vueapp = new Vue({
    delimiters: ['[[', ']]'],
    el: '#NovelFams',
    data: {
        show_items: {},
        currentPage: 1,
        perPage: 10,
        totalItems: 0,
        nPages: 1,
        currentSearch: '',
        examples: {
            fam: "GEM@3300027962_19@3300027962_19_00254@d__Bacteria|p__Fermentibacterota",
            taxa: [
                "p__Fermentibacterota",
                "p__Riflebacteria",
                "c__Thorarchaeia",
                "c__Sericytochromatia",
            ],
            context: [
                {
                    name: "Orthologous groups",
                    type: "og",
                    examples: [
                        "OG"
                    ]
                },
                {
                    name: "KEGG pathways",
                    type: "kpath",
                    examples: [
                        "KPATH"
                    ]
                },
                {
                    name: "KEGG orthologues",
                    type: "kos",
                    examples: [
                        "KO"
                    ]
                },
                {
                    name: "CARD",
                    type: "CARD",
                    examples: [
                        "CARD"
                    ]
                },
                {
                    name: "Gene name",
                    type: "pname",
                    examples: [
                        "gene"
                    ]
                },
            ]
        }
    },
    methods: {
        searchFams : function(searchType=undefined) {
            $("#search-fams").blur();
            $('.search-spinner').show();
            this.show_items = [];
            this.nPages = 1;
            this.totalItems = 0;
            let query = $("#search-fams").val().trim();
            let type = searchType || $("#search-type").val();
            let selector = '#search-fams'
            if (type == 'fam') {
                fetch(API_BASE_URL + `/info/${query}/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, ''))
                .then(() => {
                    $('.tab-content').collapse('show');
                    let idx = Object.keys(this.show_items).indexOf(query);
                    this.toggleGeCoViz(`#f${idx}-GeCoViz`, query);
                })
                .catch(e => fetchCatch(e))
            } else if (type == 'taxa'){
                this.searchFamByTaxa(selector, '');
            } else if (type == 'function') {
                this.searchFamByFunction(selector);
            }  else if (type == 'biome') {
                this.searchFamByBiome(selector);
            }
        },

        searchFamByTaxa : function(selector, prefix) {
            $('.search-spinner').show();
            let search = $(selector);
            search.blur();
            let query = prefix + search.val().trim();
            let spec = document.querySelector("#specificity").noUiSlider.get();
            let cov = document.querySelector("#coverage").noUiSlider.get();
            let fetchURL = API_BASE_URL + `/taxafams/${query}/${spec}/${cov}`;
            fetch(`${fetchURL}/0/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, fetchURL))
                .catch(e => fetchCatch(e))
        },

        searchFamByFunction : function(selector) {
            $('.search-spinner').show();
            let search = $(selector);
            search.blur();
            let query = search.val().trim();
            let queryType = $('.term-type input:checked').val();
            let conservation = document.querySelector("#conservation").noUiSlider.get();
            let fetchURL = API_BASE_URL
                + `/fnfams/${queryType}/${query}/${conservation}`;
            fetch(`${fetchURL}/0/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, fetchURL))
                .catch(e => fetchCatch(e))
        },

        searchFamByBiome : function(selector) {

        },

        fetchThen : function(data, fetchURL) {
            $('#example-cards').collapse('hide');
            $('.search-filters').collapse('hide');
            setTimeout(() => {
                this.show_items = {};
                this.show_items = data.show_items;
                this.currentSearch = fetchURL;
                this.currentPage = 1;
                this.totalItems = +data.total_matches;
                this.nPages = Math.ceil(this.totalItems/this.perPage)
            }, 0)
            setTimeout(() => {
                $('.search-spinner').hide();
                this.hideAllFams();
                this.paginateInfo();
                this.renderFamInfo();

            }, 5)
        },

        paginateInfo : function() {
            function paginate(field, perPage) {
                const nItems = field.length;
                const nPages = Math.ceil(nItems / perPage);
                const itemsToShow = nPages > 1
                    ? field.slice(0, perPage)
                    : field;
                return {
                    show_items: itemsToShow,
                    items: field,
                    nPages: nPages,
                    perPage: perPage,
                    currentPage: 1
                }
            }
            const perPage = this.perPage;
            Object.entries(this.show_items).forEach(([f, data]) => {
                const members = data.members;
                this.show_items[f].members = paginate(members, perPage);
            })
        },

        renderFamInfo : function() {
            Object.entries(this.show_items).forEach(([f, data]) => {
                const idx = Object.keys(this.show_items).indexOf(f);
                // Sources donut
                const sources = data.sources
                renderDonut('f'+idx+'-sources',
                    Object.keys(sources),
                    Object.values(sources),
                    colors,
                    'bottom',
                    65,
                    250)
                // Genomic context overview

                let summary = [
                      {
                    "gene": "JIAP01000009_gene5827",
                    "anchor": "JIAP01000009_gene5829",
                    "pos": "-2",
                    "showName": "",
                    "description": "Belongs to the GcvT family",
                    "strand": "-",
                    "start": "288981",
                    "end": "291542",
                    "taxonomy": "1380350",
                    "kegg": [{'id': '00260', 'description': ''}, {'id': '00630', 'description': ''}, {'id': '00670', 'description': ''}, {'id': '01100', 'description': ''}, {'id': '01110', 'description': ''}, {'id': '01130', 'description': ''}, {'id': '01200', 'description': ''}],
                    "eggnog": [{'id': '1MUXJ', 'level': '1224', 'description': 'Belongs to the GcvT family'}, {'id': '2TRGS', 'level': '28211', 'description': 'Belongs to the GcvT family'}, {'id': '43I40', 'level': '69277', 'description': 'Belongs to the GcvT family'}, {'id': 'COG0404', 'level': '1', 'description': 'aminomethyltransferase activity'}, {'id': 'COG0404', 'level': '2', 'description': 'aminomethyltransferase activity'}, {'id': 'COG0665', 'level': '1', 'description': 'tRNA (5-methylaminomethyl-2-thiouridylate)-methyltransferase activity'}, {'id': 'COG0665', 'level': '2', 'description': 'tRNA (5-methylaminomethyl-2-thiouridylate)-methyltransferase activity'}]
                  },
                  {
                    "gene": "JIAP01000009_gene5828",
                    "anchor": "JIAP01000009_gene5829",
                    "pos": "-1",
                    "showName": "",
                    "description": "Methyltransferase FkbM domain",
                    "strand": "-",
                    "start": "291693",
                    "end": "292451",
                    "taxonomy": "1380350",
                    "kegg": [],
                    "eggnog": [{'id': '1QY67', 'level': '1224', 'description': 'Methyltransferase FkbM domain'}, {'id': '2TXHW', 'level': '28211', 'description': 'Methyltransferase FkbM domain'}, {'id': '43RSJ', 'level': '69277', 'description': 'Methyltransferase FkbM domain'}, {'id': 'COG1215', 'level': '1', 'description': 'transferase activity, transferring glycosyl groups'}, {'id': 'COG1215', 'level': '2', 'description': 'transferase activity, transferring glycosyl groups'}]
                  },
                  {
                    "gene": "JIAP01000009_gene5829",
                    "anchor": "JIAP01000009_gene5829",
                    "pos": "0",
                    "showName": "",
                    "description": "NA",
                    "strand": "-",
                    "start": "292448",
                    "end": "293680",
                    "taxonomy": "1380350",
                    "kegg": [],
                    "eggnog": [{'id': '1NW2B', 'level': '1224', 'description': ''}, {'id': '2DS7Z', 'level': '1', 'description': ''}, {'id': '2US99', 'level': '28211', 'description': ''}, {'id': '33EXN', 'level': '2', 'description': ''}, {'id': '43PAE', 'level': '69277', 'description': ''}]
                  },
                  {
                    "gene": "JIAP01000009_gene5830",
                    "anchor": "JIAP01000009_gene5829",
                    "pos": "1",
                    "showName": "",
                    "description": "Belongs to the class-III pyridoxal-phosphate-dependent aminotransferase family",
                    "strand": "-",
                    "start": "293705",
                    "end": "295168",
                    "taxonomy": "1380350",
                    "kegg": [{'id': '00220', 'description': ''}, {'id': '00300', 'description': ''}, {'id': '00330', 'description': ''}, {'id': '01100', 'description': ''}, {'id': '01110', 'description': ''}, {'id': '01120', 'description': ''}, {'id': '01130', 'description': ''}, {'id': '01210', 'description': ''}, {'id': '01230', 'description': ''}],
                    "eggnog": [{'id': '1R6U9', 'level': '1224', 'description': 'Catalyzes the aminotransferase reaction from putrescine to 2-oxoglutarate, leading to glutamate and 4-aminobutanal, which spontaneously cyclizes to form 1-pyrroline. Is also able to transaminate cadaverine and, in lower extent, spermidine, but not ornithine'}, {'id': '2TUDK', 'level': '28211', 'description': 'Belongs to the class-III pyridoxal-phosphate-dependent aminotransferase family'}, {'id': '43IP2', 'level': '69277', 'description': 'Belongs to the class-III pyridoxal-phosphate-dependent aminotransferase family'}, {'id': 'COG4992', 'level': '1', 'description': 'transaminase activity'}, {'id': 'COG4992', 'level': '2', 'description': 'transaminase activity'}]
                  },
                  {
                    "gene": "JIAP01000009_gene5831",
                    "anchor": "JIAP01000009_gene5829",
                    "pos": "2",
                    "showName": "",
                    "description": "epimerase dehydratase",
                    "strand": "-",
                    "start": "295239",
                    "end": "296246",
                    "taxonomy": "1380350",
                    "kegg": [{'id': '00521', 'description': ''}, {'id': '00523', 'description': ''}, {'id': '00525', 'description': ''}, {'id': '01055', 'description': ''}, {'id': '01130', 'description': ''}],
                    "eggnog": [{'id': '1MW3K', 'level': '1224', 'description': 'Epimerase dehydratase'}, {'id': '2TTTJ', 'level': '28211', 'description': 'Epimerase dehydratase'}, {'id': '43HV0', 'level': '69277', 'description': 'epimerase dehydratase'}, {'id': 'COG0451', 'level': '1', 'description': 'coenzyme binding'}, {'id': 'COG0451', 'level': '2', 'description': 'coenzyme binding'}]
                  },
                ]

                const gecovizSelector = `#f${idx}-GeCoViz-summary`;
                GeCoViz(gecovizSelector, { geneRect: { h: 20 } })
                    .contextData(summary)//data.context_summary)
                    .nSide(2)
                    .geneText("gene")
                    .annotation("eggnog", 2)
                    .options({
                        'showBar': false,
                        'showLegend': false
                    })
                    .shuffleColors()
                    .draw();
                const gecovizSummary = d3.select(gecovizSelector);
                gecovizSummary
                    .select('.graph-container')
                    .style('max-height', '50px');
                gecovizSummary
                    .selectAll('.innerContainer')
                    .style('border', 'none');
                gecovizSummary
                    .style('opacity', 1)
                    .style('visibility', 'visible');

                // Render protein topologies
                setTimeout(() => renderDomains(data.domains, `#f${idx}`), 0)

                // Render sunbursts
                const sunburstSelector = `#f${idx}-taxSunburst`
                SeqSunburst(data.taxonomy, 400)
                    .draw(sunburstSelector);
            });
        },

        showAllFams : function() {
            Object.keys(this.show_items).forEach(async (f, idx) => {
                let selector = `#f${idx}-GeCoViz`;
                await this.toggleGeCoViz(selector, f)
                //$(`#f${idx}-GeCoViz .toggleLegend`).click();
            });
            $('.tab-content').collapse('show');
        },

        showExample : function(type, value) {
            let val;
            if (type == 'fam') {
                val = value || this.examples.fam;
            }
            if (type == 'taxa') {
                val = value || this.examples.taxa[0];
            }
            if (type == 'context') {
                val = value || this.examples.context[0].examples[0];
                queryType, val = val.split('_');
                $(`.term-type input[value=${queryType}]`).val();
            }
            if (type == 'biome') {
                val = '';
            }
            $('#search-fams').val(val);
            this.searchFams(type);
        },

        hideAllFams : function() {
            $('.tab-content').collapse('hide');
        },

        toggleFam : function(id, action='show') {
            $("#" + id).collapse(action);
        },

        toggleGeCoViz : async function(selector, query) {
                let newick, context;
                newick = this.show_items[query].newick;
                context = this.show_items[query].context;
                if (context) {
                    window.onload = () => {
                        d3.select(selector)
                            .style('opacity', 1)
                            .style('visibility', 'visible');
                        $(selector + " + div .gecoviz-progress").hide();
                    }
                } else {
                    $(selector + " + div .gecoviz-progress").show();
                    console.log(selector)
                    newick = await get_newick(query);
                    context = await get_context(query);
                    newickFields = [
                        'last tax level',
                        'full name',
                        'name',
                        'domain',
                        'phylum',
                        'class',
                        'order',
                        'family',
                        'genus',
                        'species'
                    ]
                    GeCoViz(selector)
                        .treeData(newick, newickFields)
                        .contextData(context)
                        .nSide(4)
                        .geneText("Gene name")
                        .annotation("Orthologous groups", 1)
                        .draw();
                    d3.select(selector)
                        .style('opacity', 1)
                        .style('visibility', 'visible');
                    $(selector + " + div .gecoviz-progress").hide();
                    this.show_items[query].newick = newick;
                    this.show_items[query].context = context;
                }
            },

        getSeq : function(query) {
            fetch(API_BASE_URL + `/seq/${query}/`)
                .then(response => response.blob())
                .then(blob => saveAs(blob, `${query}_sequence.fasta`))
        },

        getSeqs : function(query) {
            fetch(API_BASE_URL + `/seqs/${query}/`)
                .then(response => response.blob())
                .then(blob => saveAs(blob, `${query}_sequences.fasta`))
        },

        getNeighSeqs : function(query) {
            fetch(API_BASE_URL + `/neigh_seqs/${query}/`)
                .then(response => response.blob())
                .then(blob => saveAs(blob, `${query}_sequences.fasta`))
        },

        getNewick: function(query) {
            fetch(API_BASE_URL + '/tree/' + query + '/')
                .then(response => response.blob())
                .then(blob => saveAs(blob, `${query}_tree.nwx`))
        },

        getHMM: function(query) {
            fetch(API_BASE_URL + '/hmm/' + query + '/')
                .then(response => response.blob())
                .then(blob => saveAs(blob, `${query}_tree.nwx`))
        },

        getCardPage : function(page, query, field) {
            const d = this.show_items[query][field];
            if (page == 'previous') {
                page = d.currentPage > 1
                    ? d.currentPage - 1
                    : 1;
            } else if (page == 'next') {
                page = d.currentPage < d.nPages
                    ? d.currentPage + 1
                    : d.nPages;
            }
            const itemsToShow = d.items.slice(d.perPage*(page-1), d.perPage*page);
            this.show_items[query][field].show_items = [];
            this.show_items[query][field].show_items = itemsToShow;
            this.show_items[query][field].currentPage = page;
            if (field == "members") {
                const idx = Object.keys(this.show_items).indexOf(query);
                setTimeout(() => {
                    renderDomains(this.show_items[query].domains
                            .filter(d => itemsToShow.includes(d.gene)),`#f${idx}`);
                }, 0)
            }
        },

        getPage: function(page) {
            this.show_items = [];
            $('.search-spinner').show();
            if (page == 'previous') {
                page = this.currentPage > 1
                    ? this.currentPage - 1
                    : 1;
            } else if (page == 'next') {
                page = this.currentPage < this.nPages
                    ? this.currentPage + 1
                    : this.nPages;
            }
            let fetchURL = this.currentSearch;
            fetch(`${fetchURL}/${page}/`)
                .then(response => response.json())
                .then(data => {
                    this.show_items = {};
                    this.show_items = data.show_items;
                    this.currentSearch = fetchURL;
                    this.currentPage = page;
                    this.totalItems = +data.total_matches;
                    this.nPages = Math.ceil(this.totalItems/this.perPage)
                })
                .then(() => {
                    this.hideAllFams();
                    this.paginateInfo();
                    this.renderFamInfo();
                    this.scrollToTop();
                    $('.search-spinner').hide();
                })
        },

        scrollToTop: function() {
            $("html, body").animate({ scrollTop: 0 }, "slow");
        }
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
        toRounded : function(value) {
            return Math.round(+value);
        },
        toFixed : function (value, decimal=3) {
            return +(+value).toFixed(decimal);
        },
        getKeyByValue : function(value, object) {
            return Object.keys(object).find(key => object[key] === value);
        },
        getLen : function(domains, gene) {
            return domains.filter(d => d.gene == gene)[0].lenseq
        },
        signalp: function(sp, gram) {
            if(!!sp)
                return sp[gram] == 'OTHER' ? '-' : sp[gram]
            else
                return ''
        },
        trimTaxa: function(str) {
            return str.toString().slice(3);
        }
    },
});
