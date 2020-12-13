from .mongodb import mongo_connect_novelfams

def get_fam_info(identifier):
    gf = mongo_connect_novelfams()[1]
    df_identif = int(identifier.replace("_", ""))
    rawd = gf.find({'gf' : df_identif})[0]
    data = {
        "name" : rawd['gfn'],
        "members" : rawd['unigenes']
    }
    return data
