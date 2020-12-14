from .mongodb import mongo_connect_novelfams

def get_fam_info(identifier):
    gf = mongo_connect_novelfams()[1]
    int_identif = int(identifier.replace("_", ""))
    rawd = gf.find({'gf' : int_identif})[0]
    data = {
        "name" : rawd['gf'],
        "members" : rawd['unigenes'],
        "keggp" : rawd['keggp'],
        'tapx' : rawd['taxp']
    }
    get_neighborhood(identifier)
    return data

def get_neighborhood(identifier):
    gmgc_neigh = mongo_connect_novelfams()[2]
    int_identif = int(identifier.replace("_", ""))
    rawd = gmgc_neigh.find({'gf' : int_identif})[0]['neigh']
    for n in rawd:
        print("\n")
        print(n)
