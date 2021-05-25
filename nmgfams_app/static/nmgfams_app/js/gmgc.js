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

var hideSpinner = function() {
    setTimeout(() => {
        $('#spinner').modal('hide');
    }, 1000)
}

var fetchCatch = function(e) {
    console.log(e)
    hideSpinner();
    $('#alert').modal('show')
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
        searchTypeChoices: undefined,
        examples: {
            ko: [],
            synapo: [],
            card: [],
        },
        taxBadgeColors: {
            'phylum': 'bg-red-lt',
            'class': 'bg-green-lt',
            'order': 'bg-yellow-lt',
            'family': 'bg-orange-lt',
            'genus': 'bg-pink-lt',
            'species': 'bg-blue-lt',
        }
    },
    methods: {
        searchFams : async function(searchType, query, options) {
            $('#spinner').modal('show');
            this.show_items = [];
            this.nPages = 1;
            this.totalItems = 0;
            this.currentPage = options && options.page ? options.page : 1;
            query = query || $("#search-fams").val().trim();
            $("#search-fams").val(query);
            const type = searchType || $("#search-type").val();
            $('#search-fams').trigger('blur');
            if (type == 'fam') {
                this.searchFamById(query);
            } else if (type == 'taxa'){
                this.searchFamByTaxa(query, '', options);
            } else if (type == 'function') {
                this.searchFamByFunction(query, options);
            }  else if (type == 'biome') {
                this.searchFamByBiome(query, options);
            } else if (Object.keys(this.examples).includes(type)) {
                this.searchFamByExample(type, query);
            }
        },

        searchFamById : function(query) {
            const searchParams = {
                searchType: 'fam',
                query: query,
                page: this.currentPage,
            };
            fetch(API_BASE_URL + `/info/${query}/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, ''))
                .then(() => this.updateSearchParams(searchParams))
                .catch(e => fetchCatch(e));
        },

        searchFamByTaxa : function(query, prefix, options) {
            query = prefix + query;
            const spec = options && +options.specificity >= 0
                ? +options.specificity
                : document
                    .querySelector("#specificity")
                    .noUiSlider.get();
            const cov = options && +options.coverage >= 0
                ? +options.coverage 
                : document
                    .querySelector("#coverage")
                    .noUiSlider.get();
            const searchParams = {
                searchType: 'taxa',
                query: query,
                specificity: spec,
                coverage: cov,
                page: this.currentPage,
            };
            const fetchURL = API_BASE_URL + `/taxafams/${query}/${spec}/${cov}`;
            fetch(`${fetchURL}/${this.currentPage}/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, fetchURL))
                .then(() => this.updateSearchParams(searchParams))
                .catch(e => fetchCatch(e))
        },

        searchFamByFunction : function(query, options) {
            const queryType = options && options.fnType
                ? options.fnType
                : $('.term-type input:checked').val();
            const conservation = options && +options.conservation >= 0
                ? options.conservation 
                : document
                .querySelector("#conservation")
                .noUiSlider.get();
            const minRelDist = options && +options.mindist >= 0
                ? options.mindist 
                : parseInt(document.querySelector("#mindist")
                    .noUiSlider.get());
            const searchParams = {
                searchType: 'function',
                query: query,
                fnType: queryType,
                conservation: conservation,
                minDist: minRelDist,
                page: this.currentPage,
            }
            const fetchURL = API_BASE_URL
                + `/fnfams/${queryType}/${query}/${minRelDist}/${conservation}`;
            fetch(`${fetchURL}/${this.currentPage}/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, fetchURL))
                .then(() => this.updateSearchParams(searchParams))
                .catch(e => fetchCatch(e))
        },

        searchFamByBiome : function(query) {

        },

        searchFamByExample : function(exampleType, query) {
            // Change selected choice
            if (exampleType == 'synapo')
                this.searchTypeChoices.setChoiceByValue('taxa')
            else {
                // Modify exampleType to match mongodb collection
                if (exampleType == 'ko') 
                    termType = exampleType + 's'
                else if (exampleType == 'card') 
                    termType = exampleType.toUpperCase();

                this.searchTypeChoices.setChoiceByValue('function')
                d3.select('.term-type input:checked')
                    .attr('checked', null);
                d3.select(`.term-type input[value="${termType}"]`)
                    .attr('checked', true);
            }

            $('#search-fams').val(query);
            const searchParams = {
                searchType: exampleType,
                query: query,
                page: this.currentPage,
            }
            const fetchURL = API_BASE_URL
                + `/examples/${exampleType}/${query}`;
            fetch(`${fetchURL}/${this.currentPage}/`)
                .then(response => response.json())
                .then(data => this.fetchThen(data, fetchURL))
                .then(() => this.updateSearchParams(searchParams))
                .catch(e => fetchCatch(e))
        },

        fetchThen : function(data, fetchURL) {
            // Hide search filters quickly
            document.querySelectorAll('.search-filters')
                .forEach(f => f.classList.remove('show'));
            this.show_items = {};
            this.show_items = data.show_items;
            this.currentSearch = fetchURL;
            this.totalItems = +data.total_matches;
            this.nPages = Math.ceil(this.totalItems/this.perPage)
            setTimeout(() => {
                if(this.totalItems == 1)
                    this.showAllFams();
                else
                    this.hideAllFams();
                this.paginateInfo();
                this.renderFamInfo();
                hideSpinner();
            }, 0)
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
                const summary = data.context_summary;
                const gecovizSelector = `#f${idx}-GeCoViz-summary`;
                GeCoViz(gecovizSelector, { geneRect: { h: 20 } })
                    .contextData(summary)//data.context_summary)
                    .nSide(3)
                    .geneText("Gene name")
                    .annotation("Orthologous groups", "most conserved")
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

        showExamples: async function(exampleType) {
            if (this.examples[exampleType].length > 0)
                return this.examples[exampleType]
            let fetchURL = API_BASE_URL
                + `/examples/${exampleType}/info`;
            await fetch(`${fetchURL}/0/`)
                .then(response => response.json())
                .then(data => this.examples[exampleType] = data.show_items)
                .catch(e => fetchCatch(e))
            return this.examples[exampleType]
        },

        showAllFams : function() {
            Object.keys(this.show_items).forEach((f, idx) => {
                let selector = `#f${idx}-GeCoViz`;
                this.toggleGeCoViz(selector, f)
            });
            $('.tab-content').collapse('show');
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
                        .treeData(newick, newickFields[0], newickFields)
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
                .then(blob => saveAs(blob, `${query}_hmm.txt`))
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
            $('#spinner').modal('show');
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
                    this.nPages = Math.ceil(this.totalItems/this.perPage);
                    hideSpinner();
                })
                .then(() => {
                    this.hideAllFams();
                    this.paginateInfo();
                    this.renderFamInfo();
                    this.scrollToTop();
                    this.updateSearchParams({page: page}, false);
                })
                .catch(e => fetchCatch(e))
        },

        updateSearchParams: function(params, replace=true) {
            const url = new URL(location);
            if (replace) url.search = '';
            const sparams = url.searchParams;
            Object.entries(params).forEach(([k, v]) => sparams.set(k, v));
            const historyObj = {
                Title: document.title,
                Url: `${url.origin}/?${sparams.toString()}`
            };
            history.pushState(historyObj, historyObj.Title, historyObj.Url);
        },

        scrollToTop: function() {
            $("html, body").animate({ scrollTop: 0 }, "slow");
        },

        toggleSearchFilters: async function() {
            const searchTypeSelect = $('#search-type');
            const val = searchTypeSelect.val();
            await $('.search-filters').collapse('hide');
            if (val == 'taxa') {
                await $('#taxa-filters').collapse('show');
            } else if (val == 'function') {
                await $('#function-filters').collapse('show');
            }
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
    mounted: function() {
        // Allow searches coded in URL
        function getUrlParams() {
            const vars = {};
            window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
                (_,key,value) => vars[key] = value);
            return vars;
        }
        const urlParams = getUrlParams();
        const searchType = urlParams['searchType'] || 'fam';
        const sliderStartValues = {
            'specificity': urlParams.specificity || .9,
            'coverage': urlParams.coverage || .9,
            'conservation': urlParams.conservation || .9,
            'minDist': urlParams.minDist || 1,
        };

        const searchTypeSelect = $('#search-type');
        this.searchTypeChoices = new Choices(searchTypeSelect[0], {
            classNames: {
                containerInner: searchTypeSelect[0].className,
                input: 'form-control',
                inputCloned: 'form-control-sm',
                listDropdown: 'dropdown-menu',
                itemChoice: 'dropdown-item',
                activeState: 'show',
                selectedState: 'active',
                placeholder: 'choices__placeholder',
            },
            shouldSort: false,
            searchEnabled: false,
            choices : [
                {
                    value: 'fam', 
                    label: 'Family name',
                    selected: searchType == 'fam' 
                },
                {
                    value: 'taxa', 
                    label: 'Taxon name',
                    selected: searchType == 'taxa' 
                },
                {
                    value: 'function', 
                    label: 'Functional context',
                    selected: searchType == 'function' 
                },
                {
                    value: 'biome', 
                    label: 'Biome name', 
                    selected: searchType == 'biome' 
                },
            ]
          });
        searchTypeSelect.change(() => this.toggleSearchFilters());

        // Build sliders
        ["specificity", "coverage", "conservation"].forEach(id => {
                let slider = document.getElementById(id);
                noUiSlider.create(slider,
                    {
                        start: sliderStartValues[id],
                        connect: [true, false],
                        step: .01,
                        range: {
                            min: 0,
                            max: 1
                            }
                    });
                const sliderLabel = d3.select(`.${id} label`);
                slider = slider.noUiSlider;
                slider.on('update', () => {
                    const name = id.trim().replace(/^\w/, c => c.toUpperCase());
                    sliderLabel.html(name+': '+slider.get());
                })
        })
        let slider = document.getElementById("mindist");
        noUiSlider.create(slider,
            {
                start: sliderStartValues["minDist"],
                connect: [true, false],
                step: 1,
                range: {
                    min: 0,
                    max: 2
                    }
            });
        const sliderLabel = d3.select(`.mindist label`);
        slider = slider.noUiSlider;
        slider.on('update', () => {
            let name =  "Min relative distance";
            sliderLabel.html(`${name}: ${parseInt(slider.get())} gene(s)`);
        })

        const query = urlParams['query'];

        if(searchType && query)
            this.searchFams(searchType, query, urlParams);

        // Display examples
        if(this.totalItems == 0) {
            this.showExamples('ko');
            this.showExamples('synapo');
            this.showExamples('card');
        }
    },
});
