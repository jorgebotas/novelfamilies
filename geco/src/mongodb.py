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

def mongo_connect_famInfo():
    client = MongoClient('10.0.3.1', 27017, maxPoolSize=10)
    db = client.novel_fam
    gf = db.gene_families
    gmgcv1_gf = db.gf_profile_gmgcv1
    mags_annot = db.MAGs_annot
    return db, \
           gf, \
           gmgcv1_gf, \
           mags_annot

def mongo_connect_context():
    client = MongoClient('10.0.3.1', 27017, maxPoolSize=10)
    db = client.novel_fam
    gmgcv1_neighs = db.gmgcv1_neighs
    human_gut_neighs = db.neighs_human_gut
    tara_mags_neighs = db.tara_mags_neighs
    earth_mags_neighs = db.earth_mags_neighs
    return db, \
           gmgcv1_neighs, \
           human_gut_neighs, \
           tara_mags_neighs, \
           earth_mags_neighs
