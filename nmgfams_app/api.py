from django.http import HttpResponse, HttpResponseNotFound, JsonResponse
import json
from pickle import load as load_pickle

from .src.mongodb import mongo_connect
from .src.get_context import get_context, get_newick
from .src.query_fam import fams_by_taxa,\
                           fams_by_neigh_annotation,\
                           get_fams,\
                           get_hmm,\
                           get_sequence,\
                           get_sequences,\
                           get_neigh_sequences,\
                           get_newick,\
                           get_neighborhood

DOCS_PER_PAGE = 10

def info(request, query):
    data = { 'show_items' : { query :  get_fams([query]) }}
    return JsonResponse(data)

def fam_by_annotation(request, query_type, query, score, page):
    """
    Return list with fams that match neighbor annotation search
    """
    fams, total_matches = fams_by_neigh_annotation(query_type,
                                                   query,
                                                   float(score),
                                                   page)
    fams = {
        'show_items' : fams,
        'total_matches': total_matches
    }
    return JsonResponse(fams)

def fam_by_taxa(request, query, spec, cov, page):
    """Return list with fams that match taxa search
    """
    fams, total_matches = fams_by_taxa(query, float(spec), float(cov), page)
    fams = {
        'show_items' : fams,
        'total_matches': total_matches
    }
    return JsonResponse(fams)

def tree(request, query):
    tree = get_newick(query)
    if tree:
        return HttpResponse(tree, content_type='text/plain')
    print("NO TREE for specified cluster: " + str(query))
    return HttpResponseNotFound()

def context(request, query):
    context = get_neighborhood(query)
    analysis = { 'context' : context }
    return JsonResponse(analysis)

def hmm(request, query):
    hmm = get_hmm(query)
    return HttpResponse(hmm)

def sequence(request, query):
    seq = get_sequence(query)
    return HttpResponse(seq)

def sequences(request, query):
    seq = get_sequences(query)
    return HttpResponse(seq)

def neigh_sequences(request, query):
    seq = get_neigh_sequences(query)
    return HttpResponse(seq)

def fam_example(request, example_type, query, page):
    example_file = f'{example_type}_examples.pickle'
    with open(example_file, "rb") as handle:
        example_fams = load_pickle(handle)
    examples = get_fams(example_fams[query])
    fams = {
        'show_items' : fams[page*DOCS_PER_PAGE : (page+1)*DOCS_PER_PAGE],
        'total_matches': len(fams)
    }
    return JsonResponse(fams)
