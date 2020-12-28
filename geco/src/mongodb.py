from pymongo import MongoClient

def mongo_connect():
    """
    Connection to MongoDB
    """
    db = None
    if not db:
            client = MongoClient('10.0.3.1', 27017, maxPoolSize=10)
            db = client.gmgc_unigenes
            coll_unigene = db.neighbour
            coll_cluster = db.emapper_v2
            coll_e5 = db.eggnog_v5
    return [client, db, coll_unigene,coll_cluster,coll_e5]

def mongo_connect_novelfams():
    client = MongoClient('10.0.3.1', 27017, maxPoolSize=10)
    db = client.novel_fam
    gf = db.gene_families
    gmgcv1_gf = db.gf_profile_gmgcv1
    gmgcv1_neighs = db.gmgcv1_neighs
    return db, gf, gmgcv1_gf, gmgcv1_neighs
