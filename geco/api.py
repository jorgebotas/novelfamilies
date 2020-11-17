from django.http import HttpResponse, HttpResponseNotFound, JsonResponse
import json

# from .src.get_context import get_context, get_newick, mongo_connect

def random_items(request, nitems):
    import random
    data = {"show_items": {}}
    names = ["Bacteria", "Euk", "Archaea", "Firmicutes", "Clostridia", "LUCA",
             "Primates", "Metazoa", "Apicomplexa", "Viridiplantae"]
    for i in range(nitems):
        doc = {
                "newick": "(A, B);",
                "tags": ["tag", "tag100"],
                "ntips": random.randint(1, 100),
                "nnodes": random.randint(1, 100),
                "taxscope": random.sample(names, 1),
                "desc": " Some description %d " %(i),
            }
        data["show_items"]["tree_%d"%(i)] = doc
    return JsonResponse(data)

def newick(request, query):
    # try:
    client = mongo_connect()[0]
    tree = ""  # get_newick(query, client)
    return HttpResponse(tree, content_type='text/plain')
    # except:
    print("NO TREE for specified cluster: " + str(query))
    return HttpResponseNotFound()

def context(request, query, cutoff):
    isCluster = True
    isList = False
    n_neigh = 20
    # analysis = get_context(query,
                        # n_neigh,
                        # cutoff,
                        # isCluster,
                        # isList)
    analysis = ""
    return JsonResponse(analysis)
