from .mongodb import mongo_connect_novelfams

def toJSON(l, identifier):
    output = []
    print(l)
    for item in l:
        # item = eval(item)
        k = list(item.keys())[0]
        d = list(item.values())[0]
        output.append({ identifier : k, **d})
    return output

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
        'keggp' :  toJSON([eval(rawd['p_keggp'][0])], 'kegg'),
        'cogp' :  toJSON(rawd['p_cogp'], 'cog'),
        'domains' : domains,
        'biomes' : rawd['biomep']
    }
    # print(rawd['p_keggp'])
    # print(rawd['p_cogp'])
    return data

def get_neighborhood(identifier):
    gmgc_neigh = mongo_connect_novelfams()[2]
    int_identif = int(identifier.replace("_", ""))
    rawd = gmgc_neigh.find({'gf' : int_identif})[0]['neigh']
