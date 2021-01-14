from .mongodb import mongo_connect_famInfo, mongo_connect_context

def toJSON(l, identifier):
    output = []
    for item in l:
        k = list(item.keys())[0]
        d = list(item.values())[0]
        output.append({ identifier : k, **d})
    return output

def get_gf(gfn):
    # Connect to MongoDB
    db,\
        gf,\
        gmgcv1_gf,\
        mags_annot = mongo_connect_famInfo()
    gf = gf.find({'gfn' : int(gfn)})[0]['gf']
    return gf

def get_fam_info(identifier, is_gf=True):
    # Connect to MongoDB
    db,\
        gf,\
        gmgcv1_gf,\
        mags_annot_coll = mongo_connect_famInfo()
    if is_gf:
        identifier = int(identifier.replace("_", ""))
        gf_search = {'gf' : int(identifier)}
    else:
        gf_search = {'gfn' : int(identifier)}
    gf_data = gf.find(gf_search)[0]
    gmgcv1_data = gmgcv1_gf.find({'gf' : gf_data['gf']})[0]
    # Format MAGS data to obtain number of samples per MAG
    mags_raw = gf_data['mags']
    mags = {}
    for k, v in mags_raw.items():
        m = []
        for s in v.split(','):
            if s != '':
                m.append(s)
        mags[k] = m
    mannot = mags_annot_coll.find({'gf' : gf_data['gf']})[0]
    mags_annot = []
    origin_dict = {
        'human_gut' : 'Human gut',
        'tara_p' : 'TARA P',
        'tara_e' : 'TARA E',
        'earth' : 'Earth'
    }
    for origin in origin_dict.keys():
        t = []
        if mannot[origin]['tax'] != {}:
            for k, v in mannot[origin]['tax']['ta_gtdb'].items():
                for name, num in v.items():
                    t.append({
                        'level' : k,
                        'name' : name,
                        'number' : num
                    })
            mags_tax.append({
                  'lca_gtdb' : mannot[origin]['tax']['lca_gtdb'],
                  'ta_gtdb' : t
                 })
        else:
            mags_tax = {}
        mags_annot.append({
            'origin' : origin_dict[origin],
            'function' : mannot[origin]['function'],
            'tax' : mags_tax
        })
    ds = gmgcv1_data['domains']
    domains = [];
    for gene, d in ds.items():
        dms = []
        sp_p = d['signalp_p']
        sp_n = d['signalp_n']
        if sp_p != "OTHER":
            dms.append({
                'c' : 0,
                'class' : sp_p,
                'shape' : 'circle'
            })
        if sp_n != "OTHER":
            dms.append({
                'c' : 0,
                'class' : sp_n,
                'shape' : 'circle'
            })
        doms = d['topo_h']
        if len(doms) < 2:
            dms.append({
                    'start' : 0,
                    'end' : 0,
                    'shape' : 'rect'
                })
        else:
            doms = str(doms).split('-')
            for i in range(1, len(doms)):
                p = str(doms[i-1])
                c = str(doms[i])
                try :
                    start = int(p[-2:])
                except:
                    start = int(p[-1])
                try:
                    end = int(c[:2])
                except:
                    end = int(c[0])
                dms.append({
                    'start' : start,
                    'end' : end,
                    'class' : 'helix',
                    'shape' : 'rect'
                })
        domains.append({ 'gene' : gene,
                         'doms' : dms,
                         'lenseq' : d['genel']
                        })
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
        'domains' : domains,
        'ampred' : gmgcv1_data['ampred'],
        'biomes' : gmgcv1_data['biomep'],
        'taxp' :  gmgcv1_data['p_taxp'],
        'mags' : mags,
        'mags_annot' : mags_annot,
        'dnds' : gf_data['dnds'],
        'p_exp' : gf_data['p_exp'],
        'align' : gf_data['algstats'],
    }
    print(mags_annot)
    return data

def get_neighborhood(identifier, origin):
    # Connect to MongoDB
    db,\
        gmgcv1_neighs, \
        human_gut_neighs, \
        tara_mags_neighs, \
        earth_mags_neighs = mongo_connect_context()
    # gf = str(get_gf(identifier)).zfill(9)
    # gf = gf[:3] + "_" + gf[3:6] + "_" + gf[6:]
    gf = int(str(identifier).replace("_", ""))
    if len(str(gf)) == len(str(identifier)):
        identifier = int(identifier)
        gf = int(get_gf(identifier))
    search = {'gf' : gf}
    if origin == "gmgc":
        data = gmgcv1_neighs.find(search)[0]['neigh']
    elif origin == "human-gut":
        data = human_gut_neighs.find(search)[0]['neigh']
    elif origin == "tara":
        data = tara_mags_neighs.find(search)[0]['neigh']
    elif origin == "earth":
        data = earth_mags_neighs.find(search)[0]['neigh']
    else:
        data = {}
    return data
