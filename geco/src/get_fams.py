from .mongodb import mongo_connect_novelfams

def toJSON(l, identifier):
    output = []
    for item in l:
        k = list(item.keys())[0]
        d = list(item.values())[0]
        output.append({ identifier : k, **d})
    return output

def get_fam_info(identifier):
    # Connect to MongoDB
    db,\
    gf,\
    gmgcv1_gf,\
    gmgcv1_neighs = mongo_connect_novelfams()
    # int_identif = int(identifier.replace("_", ""))
    gf_data = gf.find({'gfn' : identifier})[0]
    gmgcv1_data = gmgcv1_gf.find({'gf' : gf_data['gf']})[0]
    # Format domains info
    doms = gmgcv1_data['domains']
    domains = {}
    for i in range(len(doms)):
        d = eval(doms[i])
        domains[list(d.keys())[0]] = list(d.values())[0]
    data = {
        "name" : gmgcv1_data['gf'],
        "members" : gmgcv1_data['unigenes'].split(","),
        'keggp' :  toJSON([eval(k) for k  in gmgcv1_data['p_keggp']], 'kegg'),
        'cogp' :  toJSON(gmgcv1_data['p_cogp'], 'cog'),
        'domains' : domains,
        'biomes' : gmgcv1_data['biomep'],
        'taxp' :  [eval(i) for i in gmgcv1_data['p_taxp']],
    }
    print(gf_data['source'])
    print(gf_data['ftype'])
    print(gf_data['hom'])
    print(gf_data['flength'])
    return data

def get_neighborhood(identifier):
    gmgc_neigh = mongo_connect_novelfams()[2]
    int_identif = int(identifier.replace("_", ""))
    gmgcv1_data = gmgc_neigh.find({'gf' : int_identif})[0]['neigh']
