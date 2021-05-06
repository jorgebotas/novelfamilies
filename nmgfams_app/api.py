from django.conf import settings
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

EXAMPLES_PATH = settings.BASE_DIR + "/nmgfams_app/examples"
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

    if query == "info":
        example_file = f'{EXAMPLES_PATH}/{example_type}_examples_info.pickle'
        with open(example_file, "rb") as handle:
            examples = load_pickle(handle)
        zipped = list(zip(examples.keys(), examples.values()))
        return JsonResponse({
            'show_items': zipped,
        })

    example_file = f'{EXAMPLES_PATH}/{example_type}_examples_fams.pickle'
    with open(example_file, "rb") as handle:
        example_fams = load_pickle(handle)
    examples = get_fams(example_fams[query])
    fams = {
      'show_items': example_fams[page*DOCS_PER_PAGE :(page+1)*DOCS_PER_PAGE],
      'total_matches': len(example_fams)
    }
    return JsonResponse(fams)
