from .mongodb import mongo_connect_novelfams

def get_fam_info(identifier):
    gf = mongo_connect_novelfams()[1]
    df_identif = int(identifier.replace("_", ""))
    data = gf.find({'gf' : df_identif})
    print(data)
    for r in data:
        print(r)
        data = r
    return dict(data)
