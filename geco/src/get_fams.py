from .mongodb import mongo_connect_novelfams

def get_fam_info(identifier):
    gf = mongo_connect_novelfams()[1]
    df_identif = int(identifier.replace("_", ""))
    print(df_identif)
    data = gf.find({'gf' : df_identif})
    print(data)
    for r in data:
        print(r)
        data = r
    return dict(data)
