API_BASE_URL = "/api"
STATIC_URL = "/static/geco"

import draw_protDomains from './domains.js'

var get_newick = async (query) => {
    let newick;
    await fetch(API_BASE_URL + '/newick/' + query + '/')
         .then(response => response.text())
         .then(tree => newick = tree)
         .catch(e => console.log(e))
    return newick;
}

var get_context = async (query, origin, cutoff) => {
    let context;
    await fetch(API_BASE_URL + '/context/' + origin + '/' + query + '/' + cutoff + '/')
         .then(response => response.json())
         .then(data => context = data)
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
                Object.values(mags),
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
            draw_protDomains(selector, d.doms, 1000, 600, 10, palette);
        });
}


var gmgc_vueapp = new Vue({
    delimiters: ['[[', ']]'],
    el: '#NovelFams',
    data: {
        show_items: {},
    },
    methods: {
        get_random_items: function(n) {

            fetch(API_BASE_URL + '/random_items/' + n + '/')
                .then(response => response.json())
                .then(data => {
                    this.show_items = data.show_items;
                })
                .catch(error => console.log(error));
        },

        toggleGeCo : async function(selector, query, origin) {
            let colors = await get_colors();
            let newick, context;
            try {
                newick = this.show_items[query][origin].newick;
                context = this.show_items[query][origin].context;
            } catch {
                context = undefined;
            }
            if (context) {
                window.onload = async () => {
                    await $(selector + " .geco-progress").show().delay(2000);
                    await window.launch_GeCo(selector, context, newick, 41, colors);
                    await $(selector + " .geco-progress").hide();
                }
            } else {
                await $(selector + " .geco-progress").show();
                newick = await get_newick(query);
                context = await get_context(query, origin, 30);
                await window.launch_GeCo(selector, context, newick, 41, colors);
                await $(selector + " .geco-progress").hide();
                this.show_items[query][origin].newick = newick;
                this.show_items[query][origin].context = context;
            }
        },

        searchFams : function() {
            $("#search-fams").blur();
            let val = $("#search-fams").val();
            let type = $("#search-fams-type").val();
            fetch(API_BASE_URL + '/info/' + type + '/' + val + '/')
                .then(response => response.json())
                .then(data => {
                    this.show_items = data.show_items
                })
                .then(() => {
                    Object.entries(this.show_items).forEach(([f, data]) => {
                        drawDonuts(f, data);
                        renderDomains(data.domains);
                    });
                    $('.tab-content').collapse('show');
                })
        },

        showAllFams : function() {
            $('.tab-content').collapse('show');
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
    },
});
