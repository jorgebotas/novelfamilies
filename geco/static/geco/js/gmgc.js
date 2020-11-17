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
        query: { nitems: 20 },
        // Your custom data data
        show_items: {
            "tree_name1": {
                "newick": "(A, B);",
                "tags": ["tag1", "tag2"],
                "ntips": 20,
                "nnodes": 49,
                "taxscope": "Bilateria",
                "desc": " Some description 1",
            },

            "tree_name2": {
                "newick": "(A, B);",
                "tags": ["tag1", "tag2"],
                "ntips": 454,
                "nnodes": 4934,
                "taxscope": "Bilateria and others",
                "desc": " Some description 2 ",
            },


            "tree_name3": {
                "newick": "(A, B, C , D);",
                "tags": ["tag1"],
                "ntips": 210,
                "nnodes": 490,
                "taxscope": "Eukaryota",
                "desc": " Some description 3 fsdlkj lfsd;lj fsdl;kj ",
            },


            "tree_name4": {
                "newick": "(A, B);",
                "tags": ["tag1", "tag100"],
                "ntips": 20,
                "nnodes": 449,
                "taxscope": "Bacteria",
                "desc": " Some description 4 asnd f fl;kj fdslkj fdjk fdsl;kj fsd;lkj fsd ",
            }
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
                window.onload = () => {
                    await window.launch_GeCo(selector, context, newick, 41, colors);
                }
            } else {
                old_query = query;
                query = "095_560_840";
                await $(selector + " .geco-progress").show();
                newick = await get_newick(query);
                context = await get_context(query, "cluster", 30);
                await window.launch_GeCo(selector, context, newick, 41, colors);
                await $(selector + " .geco-progress").hide();
                this.show_items[old_query].newick = newick;
                this.show_items[old_query].context = context;
            }
        }
    }
});
