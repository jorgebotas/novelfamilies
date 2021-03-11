from django.http import HttpResponse, HttpResponseNotFound, JsonResponse
import json

from .src.mongodb import mongo_connect
from .src.get_context import get_context, get_newick
from .src.get_fams import get_fam_info
from .src.query_fam import fams_by_taxa, get_fam

def info(request, query):
    data = { "show_items" : {
        query : {
        'name':  query,
        'gf' : query,
        'source' : '',
        'ftype' : '',
        'hom' : '',
        'flength' : '',
        'members': [],
        'keggp' : [],
        'cogp' : [],
        'sstr' : '',
        'domains' : [],
        'ampred' : '',
        'biomes' : {},
        'taxp' :  '',
        'mags' : [],
        'mags_annot' : [],
        'dnds' : '',
        'p_exp' : '',
        'align' : {},
        }
    } }

    # if search_type == "gmgc":
        # data["show_items"] = { query : get_fam_info(query, True) }
    # elif search_type == "novelfam":
        # data["show_items"]  = { query : get_fam_info(query, False) }
    # elif search_type == "function":
        # pass
    return JsonResponse(data)

def fam_by_taxa(request, query, spec, cov):
    """Return list with fams that match taxa search
    """
    fams = fams_by_taxa(query, float(spec), float(cov))
    print(fams)
    fams = { 'show_items' : fams }
    return JsonResponse(fams)

def newick(request, query):
    # try:
        # client = mongo_connect()[0]
        # tree = get_newick(query, client)
        # return HttpResponse(tree, content_type='text/plain')
    # except:
        # print("NO TREE for specified cluster: " + str(query))
    return HttpResponseNotFound()

def context(request, query):
    context = get_fam(query)
    analysis = { 'context' : context }
    return JsonResponse(analysis)
