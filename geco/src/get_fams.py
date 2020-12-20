from .mongodb import mongo_connect_novelfams

def get_fam_info(identifier):
    gf = mongo_connect_novelfams()[1]
    int_identif = int(identifier.replace("_", ""))
    rawd = gf.find({'gf' : int_identif})[0]
    doms = rawd['domains']
    domains = {}
    for i in range(len(doms)):
        d = eval(doms[i])
        domains[list(d.keys())[0]] = list(d.values())[0]
    data = {
        "name" : rawd['gf'],
        "members" : rawd['unigenes'].split(","),
        "keggp" : rawd['keggp'],
        'tapx' : rawd['taxp'],
        'domains' : domains
    }
    print(rawd['biomep'])
    return data

def get_neighborhood(identifier):
    gmgc_neigh = mongo_connect_novelfams()[2]
    int_identif = int(identifier.replace("_", ""))
    rawd = gmgc_neigh.find({'gf' : int_identif})[0]['neigh']
