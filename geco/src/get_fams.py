from .mongodb import mongo_connect_novelfams

def toJSON(l, identifier):
    output = []
    for item in l:
        k = list(item.keys())[0]
        d = list(item.values())[0]
        output.append({ identifier : k, **d})
    return output

def get_gf(identifier):
    # Connect to MongoDB
    db,\
    gf,\
    gmgcv1_gf,\
    gmgcv1_neighs = mongo_connect_novelfams()
    # int_identif = int(identifier.replace("_", ""))
    gf = gf.find({'gfn' : int(identifier)})[0]['gf']
    return gf

def get_fam_info(identifier):
    # Connect to MongoDB
    db,\
    gf,\
    gmgcv1_gf,\
    gmgcv1_neighs = mongo_connect_novelfams()
    # int_identif = int(identifier.replace("_", ""))
    gf_data = gf.find({'gfn' : int(identifier)})[0]
    gmgcv1_data = gmgcv1_gf.find({'gf' : gf_data['gf']})[0]
    # Format MAGS data to obtain number of samples per MAG
    mags_raw = gf_data['mags']
    mags = {}
    for k, v in mags_raw.items():
        mags[k] = len(v.split(','))
    data = {
        'name':  identifier,
        'gf' : gmgcv1_data['gf'],
        'source' : gf_data['source'],
        'ftype' : gf_data['ftype'],
        'hom' : gf_data['hom'],
        'flength' : gf_data['flength'],
        'members': gmgcv1_data['unigenes'].split(","),
        'keggp' : gmgcv1_data['p_keggp'],
        'cogp' : gmgcv1_data['p_cogp'],
        'sstr' : gmgcv1_data['sstr'],
        'domains' : gmgcv1_data['domains'],
        'biomes' : gmgcv1_data['biomep'],
        'taxp' :  gmgcv1_data['p_taxp'],
        'mags' : mags,
        'dnds' : gf_data['dnds'],
        'p_exp' : gf_data['p_exp'],
        'align' : gf_data['algstats'],
    }
    return data

def get_neighborhood(identifier):
    # Connect to MongoDB
    db,\
    gf,\
    gmgcv1_gf,\
    gmgcv1_neighs = mongo_connect_novelfams()
    gf = str(get_gf(identifier))
    gf = gf[:3] + "_" + gf[3:6] + "_" + gf[6:]
    print(gf)
    gmgcv1_data = gmgcv1_neighs.find({'gf' : gf})[0]
    return gmgcv1_data
