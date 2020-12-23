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

var get_context = async (query, datatype, cutoff) => {
    let context;
    await fetch(API_BASE_URL + '/context/' + query + '/' + cutoff + '/')
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

var gmgc_vueapp = new Vue({
    delimiters: ['[[', ']]'],
    el: '#NovelFams',
    data: {
        //query: { nitems: 20 },
        // Your custom data data
        show_items: {
/*            "tree_name1": {*/
                //"newick": "(A, B);",
                //"tags": ["tag1", "tag2"],
                //"ntips": 20,
                //"nnodes": 49,
                //"taxscope": "Bilateria",
                //"desc": " Some description 1",
            //},

            //"tree_name2": {
                //"newick": "(A, B);",
                //"tags": ["tag1", "tag2"],
                //"ntips": 454,
                //"nnodes": 4934,
                //"taxscope": "Bilateria and others",
                //"desc": " Some description 2 ",
            //},


            //"tree_name3": {
                //"newick": "(A, B, C , D);",
                //"tags": ["tag1"],
                //"ntips": 210,
                //"nnodes": 490,
                //"taxscope": "Eukaryota",
                //"desc": " Some description 3 fsdlkj lfsd;lj fsdl;kj ",
            //},


            //"tree_name4": {
                //"newick": "(A, B);",
                //"tags": ["tag1", "tag100"],
                //"ntips": 20,
                //"nnodes": 449,
                //"taxscope": "Bacteria",
                /*"desc": " Some description 4 asnd f fl;kj fdslkj fdjk fdsl;kj fsd;lkj fsd ",*/
            //}
        },

    },
    methods: {
        get_random_items: function(n) {

            fetch(API_BASE_URL + '/random_items/' + n + '/')
                .then(response => response.json())
                .then(data => {
                    console.log(data.show_items);
                    this.show_items = data.show_items;
                })
                .catch(error => console.log(error));
        },

        toggleGeCo : async function(selector, query) {
            let newick = this.show_items[query].newick;
            let context = this.show_items[query].context;
            let colors = await get_colors();
            if (context) {
                window.onload = async () => {
                    await $(selector + " .geco-progress").show().delay(2000);
                    await window.launch_GeCo(selector, context, newick, 41, colors);
                    await $(selector + " .geco-progress").hide();
                }
            } else {
                //old_query = query;
                //query = "095_560_840";
                await $(selector + " .geco-progress").show();
                newick = await get_newick(query);
                context = await get_context(query, "cluster", 30);
                await window.launch_GeCo(selector, context, newick, 41, colors);
                await $(selector + " .geco-progress").hide();
                this.show_items[query].newick = newick;
                this.show_items[query].context = context;
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
                    $('.tab-content').collapse('show');
                })
        },

        showAllFams : function() {
            $('.tab-content').collapse('show');
        },

        toggleFam : function(id) {
            $("#" + id).collapse('show');
        },

        donutBiome : function(id, biomes) {
            let div = document.getElementById(id);
            //if (div.children.length == 0) {
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
                series: Object.values(biomes),
                //labels: Object.keys(biomes),
                labels : [
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
                grid: {
                    strokeDashArray: 14,
                },
                //colors: ["#206bc4", "#79a6dc", "#bfe399", "#e9ecf1"],
                colors: ["#abfdcb",
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
                            "#fff600"],
                legend: {
                    position : 'right',
                },
                tooltip: {
                    fillSeriesColor: false
                },
            }
            //window.ApexCharts &&
            var chart = new ApexCharts(div, options);
            chart.render();
            //}
        },

    },
    filters : {
        signal_blank : function (value) {
            return value == "OTHER" ? "-" : value;
        },
    },
});
