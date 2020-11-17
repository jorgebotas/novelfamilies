from collections import Counter
from ete3 import Tree, NCBITaxa
import gridfs
from json import dump, dumps
import numpy as np
import operator
import pandas as pd
import pickle
import sys, os, shutil

from django.conf import settings

from .mongodb import mongo_connect


STATIC_PATH = settings.BASE_DIR + '/static/geco/'
RESULTS_PATH = settings.BASE_DIR + '/geco/results.tmp/'



def mongo_orf_find(GMGC,max_gmgc_genes,coll_unigenes):
        """ retrieve orf genomic information"""
        GMGC_cluster = coll_unigenes.find({"u":GMGC})
        GMGC_dict = {}
        for orf in GMGC_cluster:
            orf = orf['o']
            for a in orf:
                gene = a['g']
                Locus = a['s']
                start = Locus[0]
                end = Locus[1]
                strand = Locus[2]
                try:
                        GMGC_dict[gene]=[start,end,strand]

                except:
                        print("ERROR retrieving ORF info from gmgc cluster")
        return GMGC_dict


def mongo_functional_find(GMGC, coll_clusters):
        """ get functional information from mongo.clusters db for gmgc element"""
        kegg_list = [] # store the keggs
        Egg = [] # store the Eggnogs cogs
        GMGC_function = coll_clusters.find({"u":GMGC})
        GMGC_function_list =[]
        for element in GMGC_function:
                kegg = element['K_P']
                kegg = kegg.split(",")

                for n in kegg: # Only keep KEGG pathways
                    if n in kegg_dict and n not in kegg_list:
                        kegg_list.append(n)

                Egg = element['OGs'].split(",")
                for n in Egg:
                    if n.split("@")[1] == "1":
                        Egg.remove(n)

        GMGC_function_list=[kegg_list, Egg]

        return GMGC_function_list


def retrieve_gmgc(gene, coll_unigenes, limit=True):
        """ retrieve gmgc for every orf from unigenes db """
        if limit:
            GMGC_function = coll_unigenes.find({"o.g":gene},{"u":1}).limit(1)
        else:
            GMGC_function = coll_unigenes.find({"o.g":gene},{"u":1})

        selected = []
        gmgc = ""
        for n in GMGC_function:
                try:
                        gmgc = n["u"]
                        selected.append(gmgc)
                except:
                        gmgc = ""
        if not limit:
            gmgc = selected
        return gmgc


def retrieve_gene_info(gene, coll_unigenes):
    """ retrieve start, end and strand data from gene name """

    start, end, strand = ("", "", "")
    cluster = coll_unigenes.find({"o.g":gene})
    for orf in cluster:
        orf = orf['o']
        for a in orf:
            g = a['g']
            if g == gene:
                start, end, strand = a['s']
    return {
        "start" : start,
        "end" : end,
        "size" : int(end) - int(start),
        "strand" : strand
    }


def retrieve_neighbors(gmgc_cluster,neighbor_range):
        """ get a dict containing -2-1+1+2 neighbor genes list surrounding
        the unigenes in every contig and strand orientation """

        neigh_dict = {}
        for k,v in gmgc_cluster.items():
                gene_ordered =[]
                query_gene = k
                start = v[0]
                end = v[1]
                strand = v[2]
                orf = k.split("_")
                gene = int(orf[3])
                sample_contig = orf[0:3]

                for gene_pos in range(-neighbor_range,neighbor_range+1,1):
                        sample_cont = []
                        genes = int(gene)+int(gene_pos)
                        sample_cont = sample_contig[0:3]
                        sample_cont.append(str(genes))
                        genes = "_".join(sample_cont)
                        gene_ordered.append(genes)
                neigh_dict[query_gene] = {
                    'strand' : strand,
                    'neighborhood' : gene_ordered
                }

        return neigh_dict


def retrieve_functional_data(unigene, coll_clusters, coll_e5):
    kegg_ids, egg_ids = mongo_functional_find(unigene, coll_clusters)
    keggs = {
        kg : {
                'description': get_kegg_description(kg)
             }  for kg in kegg_ids
            }
    eggs = {}
    for egg in egg_ids:
        info = {}
        split = egg.split("@")
        info['id'] = egg
        info['description'] = get_egg_description(egg, coll_e5)
        try:
            eggs[split[-1]][split[0]] = info
        except:
            eggs[split[-1]] = {}
            eggs[split[-1]][split[0]] = info
        try: egg_levels[split[-1]] = eggNOG_DICT[int(split[-1])]
        except: pass
    return {
            'gene' : unigene,
            'KEGG' : keggs,
            'eggNOG' : eggs
    }


def get_unigene_info(unigene, db, coll_clusters, coll_e5, ncbi):
    info = {
        'gene' : unigene,
        'GMGFam' : get_cluster(unigene, db),
        'preferred_name' : get_preferred_name(unigene, db),
        'tax_prediction' : get_taxonomic_prediction(unigene, db, ncbi)
    }
    # Retrieve KEGG and eggNOG data
    functional_data = retrieve_functional_data(unigene,
                                             coll_clusters,
                                             coll_e5)
    return { **info, **functional_data }


def get_pickle(filepath):
    """generate kegg pathway dictionary containning kegg descriptions"""
    # read dictionary from pickle file
    with open(filepath, 'rb') as pickle_in:
        pdict = pickle.load(pickle_in)
    return pdict


def get_kegg_description(kegg):
        """retrieve kegg description from kegg_dict hash """
        description = kegg_dict[kegg]

        return description


def get_egg_description(Egg, coll_e5):
	""" connect to mongo eggnog5 database
	and retrieve description of Egnog """
	Egg = Egg.split("@")[0]
	e5_database = coll_e5.find({"e":Egg})
	description = ""

	for element in e5_database:
		description = element["d"]

	return description


def clean_unigene(gmgc):
        '''in case GMGC nomeclature was used in the input example,
         GMGC.100_000_123.UNKNOWN words after/before . are removed'''
        gmgc_clean = gmgc.split(".")[1]

        return gmgc_clean


def summarize_neighborhood(gmgc, neighborhood, orf_data, n_contig):
    # Retrieve most frequent unigene in each position
    # and its KEGG and eggNOG data
    for pos, l in neighborhood.items():
        neigh_data = {}
        if (len(l) > 0):
            counter = Counter(list(l))
            most_freq = max(counter.items(), key=operator.itemgetter(1))
            freq = most_freq[1] / sum(counter.values())
            if most_freq[0] == "NA":
                if len(counter.keys()) > 1:
                    neigh_data['metadata'] = "Missing frequency: {}"\
                                             .format("{0:.3f}".format(freq))
                    copy = dict(counter)
                    copy.pop("NA")
                    most_freq = max(copy.items(),
                                    key=operator.itemgetter(1))
                    freq = counter[most_freq[0]] / sum(counter.values())

            neigh_data = get_unigene_info(most_freq[0],
                                          db,
                                          coll_clusters,
                                          coll_e5,
                                          ncbi)
            neigh_data['frequency'] = "{0:.3f}".format(freq)
            neigh_data['n_contig'] = n_contig
            if (most_freq[0] != "NA"):
                neigh_data = { **neigh_data,
                               **orf_data[pos][most_freq[0]] }
        neighborhood[pos] = neigh_data
    if (neighborhood[0] == {}):
        neighborhood = {
                         0 : { 'gene' : gmgc,
                               'GMGFam' : get_cluster(gmgc, db),
                               'preferred_name' : get_preferred_name(gmgc,
                                                                     db),
                               'tax_prediction' : get_taxonomic_prediction(gmgc,
                                                                   db,
                                                                   ncbi),
                               'KEGG' : {},
                               'eggNOG' : {},
                               'metadata' : "singleton"
                              }
                        }
    return dict(neighborhood)


def swap_strand(s, reference_s):
    if reference_s == "+":
        return s
    else:
        if s == "+":
            return "-"
        elif s == "-":
            return "+"
    return "NA"


def format_neighborhood(gmgc,
                        neighborhood_genes,
                        neighbor_range,
                        retrieve_unique_contigs=False):
    neighborhood = { p : [] for p in range(-neighbor_range, neighbor_range+1) }
    unique_contigs = {}
    contigs = []
    orf_data = {}
    n_contig = 0
    for dummy, v in neighborhood_genes.items():
        gene_list = v['neighborhood']
        strand = v['strand']
        if strand == '-':
            gene_list.reverse()
        central_gene = retrieve_gmgc(gene_list[neighbor_range],
                                     coll_unigenes,
                                     False)
        # CHECK central_gene == gmgc
        if gmgc in central_gene:
            n_contig += 1
            contig = []
            contig_d = {}
            for n in range(0,(neighbor_range*2+1),1):
                pos = n - neighbor_range
                if pos == 0:
                    gmgc_orf = gmgc
                else:
                    gmgc_orf = retrieve_gmgc(gene_list[n],
                                             coll_unigenes,
                                             True)
                if gmgc_orf == '':
                    gmgc_orf = 'NA'
                else:
                    info = retrieve_gene_info(gene_list[n],
                                              coll_unigenes)
                    info['strand'] = swap_strand(info['strand'], strand)
                    if pos == 0 and strand == "-":
                        info['swapped'] = 1
                    contig_d[gmgc_orf] = info
                    if not retrieve_unique_contigs:
                        try:
                            orf_data[pos][gmgc_orf] = info
                        except:
                            orf_data[pos] = {}
                            orf_data[pos][gmgc_orf] = info
                neighborhood[pos].append(gmgc_orf)
                contig.append(gmgc_orf)
            if retrieve_unique_contigs:
                contigs.append(tuple(contig))
                orf_data[tuple(contig)] = contig_d

    if retrieve_unique_contigs:
        inc = 0
        for cont, n in dict(Counter(contigs)).items():
            contig = { 'n' : n }
            contig_d = orf_data[tuple(cont)]
            for i, gene in enumerate(cont):
                pos = i - neighbor_range
                contig[pos] = get_unigene_info(gene,
                                               db,
                                               coll_clusters,
                                               coll_e5,
                                               ncbi)
                if gene != "NA":
                    contig[pos] = {**contig[pos], **contig_d[gene]}
            contig[0]['KEGG']['prediction'] = subject_functional_data(gmgc,
                                                     neighborhood_genes,
                                                     neighbor_range,
                                                     "kegg")
            contig[0]['eggNOG']['prediction'] = subject_functional_data(gmgc,
                                                     neighborhood_genes,
                                                     neighbor_range,
                                                     "Egg")
            unique_contigs[inc] = {}
            unique_contigs[inc]['neighborhood'] = contig
            unique_contigs[inc]['gene'] = gmgc
            inc += 1
        return dict(unique_contigs)
    else:
        return summarize_neighborhood(gmgc, neighborhood, orf_data, n_contig)


def compute_neigh_cogs_assignation(neighbor_genes,
                                   neighbor_range,
                                   coll_unigenes,
                                   coll_clusters,
                                   cog_category):
    # storage cogs assgination for every unigene
    cogs_organization_list = []
    # number of orfs (unigenes) that contains a GMGC cluster
    analysed_orfs = 0
    # number of neighbors genes present in that GMGC cluster
    number_neigh = 0
    # number of neighbors genes present in that gmgc cluster
    # that contains cog assignation
    number_neigh_with_cogs= 0
    # storage all the cogs retrieved from neighbors genes
    unigenes_function_list = []

    for d in neighbor_genes.values():
        gene_list = d['neighborhood']
        analysed_orfs += 1

        range_list = []
        for num in range(0,neighbor_range*2,1):
                range_list.append(num)

        gmgc_list = [] # list for functional analysis developed below

        for n in range_list:
                gmgc_orf = retrieve_gmgc(gene_list[n],
                                         coll_unigenes,
                                         True)
                gmgc_list.append(gmgc_orf)

        #retrieve list of neigh orfs containing COGS instead of unigene code
        cogs_organization = []
        for unigene in gmgc_list:
                avoid_cog_repeated = []
                cog = ["NA"]
                if unigene != '':
                        number_neigh +=1

                try:
                    if cog_category == "kegg":
                            cog = mongo_functional_find(unigene,
                                                  coll_clusters)[0]
                    else:
                            cog = mongo_functional_find(unigene,
                                                  coll_clusters)[1]

                except:
                        cog = ["NA"]

                if cog == []:
                        cog=["NA"]

                if cog != ["NA"] and cog[0] != '':
                        number_neigh_with_cogs +=1

                if cog[0] =='':
                        cog= ["NA"]
                        cogs_organization.append(cog)
                else:
                        cogs_organization.append(cog)
                for n in cog: # clean the cogs to avoid future errors
                        if cog_category == "kegg":
                                if n in kegg_dict and n not in avoid_cog_repeated and n != '':
                                        avoid_cog_repeated.append(n)
                                        unigenes_function_list.append(n)
                        else:
                                if n not in avoid_cog_repeated and n != '':
                                        if n != 'NA':
                                                avoid_cog_repeated.append(n)
                                                unigenes_function_list.append(n)


        cogs_organization_list.append(cogs_organization)

    return [cogs_organization_list,
        analysed_orfs,
        number_neigh,
        number_neigh_with_cogs,
        unigenes_function_list
        ]


def get_neigh_orf_with_cogs(cogs_organizacion_list):
	""" calculate number of unigenes with at least
	one neigh genes with cog assignation"""

	cog_depured_list =[]
	for k in cogs_organizacion_list:
		if k.count("NA") != 4:
			cog_depured_list.append(k)

	neigh_orf_with_cogs = len(cog_depured_list)

	return neigh_orf_with_cogs


def neigh_scores(hits,
                 num_query_cog,
                 subject_cog_list,
                 unique_cogs,
                 count_of_cogs,
                 neigh_orf_with_cogs):
	""" most important neigh score is functional
        conservation developed for GMGC nature """

	#positve value (how many of preasignned keggs were retrieved keggs for that unigene)
	try:
		positive_value = ("{0:.2f}".format(int(hits)/num_query_cog))
	except:
		positive_value = 0

	#accuracy value (proportion of how many retrieved keggs were correct)
	try:
		accuracy_value = ("{0:.2f}".format(hits/len(subject_cog_list)))
	except:
		accuracy_value = 0

	#operon functional conservation proxy
	try:
		func_conservation = ("{0:.3f}".format(1-(unique_cogs/count_of_cogs)/neigh_orf_with_cogs)) # neigh of with cogs its the same that the number of ORF that enter in the neigh analysis
	except:
		func_conservation = 0

	return [positive_value,
                accuracy_value,
                func_conservation
                ]


def subject_cog_description(subject_cog_dict,
                             query_list,
                             gg_description_dict,
                             cog_category):
    hits = 0
    for cog, dummy in subject_cog_dict.items():
        if cog in query_list:
            hits += 1

    cog_dict = {}
    try:
        if query_list == [u'']:
            query_list =['NA']
        for cog in query_list:
            if cog_category == "kegg":
                gg_description_dict[cog]=get_kegg_description(cog)
            else:
                gg_description_dict[cog]=get_egg_description(cog,coll_e5)
    except:
        query_list= ["NA"]
    try:
        for cog, description in gg_description_dict.items():
            info = {}
            info['description'] = description
            try:
                info['percentage'] = subject_cog_dict[cog]
            except:
                info['percentage'] = "NA"
            if cog_category != "kegg":
                split = cog.split("@")
                info['id'] = cog
                try:
                    cog_dict[split[-1]][split[0]] = info
                except:
                    cog_dict[split[-1]] = {}
                    cog_dict[split[-1]][split[0]] = info
            else:
                cog_dict[cog] = info
    except:
        pass
    return hits, query_list, cog_dict


def subject_functional_data(gmgc,
                            neighborhood_genes,
                            neighbor_range,
                            cog_category):

    cogs_organization_list,\
    analysed_orfs,\
    number_neigh,\
    number_neigh_with_cogs,\
    unigenes_function_list = compute_neigh_cogs_assignation(
                                   neighborhood_genes,
                                   neighbor_range,
                                   coll_unigenes,
                                   coll_clusters,
                                   cog_category)

    # number of genes that have at least one cog in his neighobours
    neigh_orf_with_cogs = get_neigh_orf_with_cogs(cogs_organization_list)

    # compute total number of cogs and unique cogs in the unigene cluster
    Count = Counter(unigenes_function_list)
    unique_cogs = 0
    count_of_cogs = 0
    for dummy, v in Count.items():
            count_of_cogs += int(v)
            unique_cogs +=1
    # This section compute if any of the cogs are highly representated
    # in the neighborhood of the unigenes
    # In the case there are cogs overepresentated
    # they are storage in gg_description_dict
    gg_description_dict = {}
    subject_cog_list = [] # store subject list of cog
    subject_cog_dict = {} # cog that surpass cutoff limit
    for cog, v in Count.items():
        # compute percentage of number of neighbors genes with cogs
        percentage = float(v/neigh_orf_with_cogs)*100
        percentage = ("{0:.2f}".format(percentage))

        if float(percentage) >= percentage_cutoff:
            if cog_category == "kegg":
                gg_description_dict[cog] = get_kegg_description(cog)
            else:
                gg_description_dict[cog] = get_egg_description(cog,
                                                                 coll_e5)

                subject_cog_dict[cog]=percentage
                subject_cog_list.append(cog)

    # Get funciontal scores and cogs description of enriched cogs
    if gg_description_dict != {}:
            # Retrieve functional information from GMGC query
            gmgc_functional = mongo_functional_find(gmgc,coll_clusters)
            if cog_category == "kegg":
                    query_list = gmgc_functional[0]
            else:
                    query_list = gmgc_functional[1]
            # get functional description and COG hits
            hits,\
            query_list,\
            cog_data = subject_cog_description(subject_cog_dict,
                                                query_list,
                                                gg_description_dict,
                                                cog_category)

            # get functional scores
            positive_value,\
            accuracy_value,\
            func_conservation = neigh_scores(hits,
                                      len(query_list),
                                      subject_cog_list,
                                      unique_cogs,
                                      count_of_cogs,
                                      neigh_orf_with_cogs)
            return {
                'scores': {
                    'positive-value' : positive_value,
                    'accuracy-value' : accuracy_value,
                    'function-conservation' : func_conservation
                },
                **cog_data
            }
    else:
        return {}


def get_cluster(unigene, db):
    try:
        cluster = db.clusters.find({'u':unigene}, {'cl':1})[0]['cl']
    except:
        cluster = "NA"
    return cluster


def get_preferred_name(unigene, db):
    try:
        p_n = db.emapper_v2.find({"u":unigene}, {'p_n':1})[0]['p_n']
    except:
        p_n = "NA"
    return p_n


def get_taxonomic_prediction(unigene, db, ncbi):
    tax_pred = {}
    try:
        tax_id = db.taxo_map.find({"u": unigene},
                                  {"n":1, "txid":1})[0]['txid']
        lineage = ncbi.get_lineage(int(tax_id))
        for tid in lineage:
                rank = ncbi.get_rank([tid]).values()
                rank = str(rank)[14:-3]
                desc = ncbi.get_taxid_translator([tid]).values()
                desc = str(desc)[14:-3]
                if rank != "no rank":
                    tax_pred[rank] = { tid : {
                        "rank" : rank,
                        "id" : tid,
                        "description" : desc
                    }}

    except: pass
    return tax_pred


def neighbor_analysis(gmgc, unique_contigs=False, json=True):
    data = {}
    if "GMGC" in gmgc:
        gmgc = clean_unigene(gmgc)

    #Retrieve neighbor genes for every ORFs in the GMGC cluster
    gmgc_orfs_cluster = mongo_orf_find(gmgc,
                                       max_gmgc_genes,
                                       coll_unigenes)

    neighborhood_genes = retrieve_neighbors(gmgc_orfs_cluster,
                                            neighbor_range)


    # Retrieve most frequent neighbors and retrieve their KEGG and eggNOG data
    neighborhood = format_neighborhood(gmgc,
                                       neighborhood_genes,
                                       neighbor_range,
                                       unique_contigs)
    if not unique_contigs:
        kegg_prediction = subject_functional_data(gmgc,
                                                 neighborhood_genes,
                                                 neighbor_range,
                                                 "kegg")
        eggNOG_prediction = subject_functional_data(gmgc,
                                                 neighborhood_genes,
                                                 neighbor_range,
                                                 "Egg")
        if (kegg_prediction != {}):
            neighborhood[0]['KEGG'] = {}
            neighborhood[0]['KEGG']['prediction'] = dict(kegg_prediction)
            data['KEGG'] = {}
            data['KEGG']['prediction'] = kegg_prediction
        if (eggNOG_prediction != {}):
            neighborhood[0]['eggNOG']['prediction'] = dict(eggNOG_prediction)
        data['neighborhood'] = neighborhood
        # print(data['neighborhood'][0])
    else:
        # data represents all the unique contigs of gmgc
        # Therefore, neighborhood is not "summarized"
        data = neighborhood

    if json:
        return dumps(data)
    return data


def get_unigenes_and_tree(query_cluster, results_dir, client):
    treedb = client.trees
    fs = gridfs.GridFS(treedb)
    tfile = fs.find_one({"filename":query_cluster})
    treedata = fs.get(tfile._id)

    orig_newick = str(treedata.read(), "utf-8:")

    #Clean up newick
    t = Tree(orig_newick)
    cluster_unigenes = []
    for node in t:
        node.name = node.name.split('.')[1]
        cluster_unigenes.append(node.name)

    newick = t.write()
    shutil.rmtree(results_dir)
    os.makedirs(results_dir, exist_ok = True)
    with open(results_dir + query_cluster + "_newick.txt", "w") as outputfile:
        outputfile.write(newick)
    return cluster_unigenes


def get_newick(query, client):
    treedb = client.trees
    fs = gridfs.GridFS(treedb)
    tfile = fs.find_one({"filename":query})
    treedata = fs.get(tfile._id)

    orig_newick = str(treedata.read(), "utf-8:")

    #Clean up newick
    t = Tree(orig_newick)
    for node in t:
        node.name = node.name.split('.')[1]
    newick = t.write()
    return newick


def get_context(query, n_range, cutoff, cluster=True, isList=False, json=False):

    ### MongoDB call
    global client, db, coll_unigenes, coll_clusters, coll_e5
    client,\
    db,\
    coll_unigenes,\
    coll_clusters,\
    coll_e5 = mongo_connect()

    global ncbi
    ncbi = NCBITaxa()

    ### Analysis parameters
    global max_gmgc_genes, percentage_cutoff, neighbor_range
    # maximun number of unigene allowed by gmgc cluster to be computed,
    # smaller the number smaller computing time
    max_gmgc_genes = int(400)
    # percentage of kegg/eggnog conservation in neighbor unigenes
    percentage_cutoff = float(cutoff)
    # number of neighbors genes to analyze around each unigene
    neighbor_range = n_range

    ### KEGG pathways
    global kegg_dict, eggNOG_DICT, egg_levels
    kegg_path = STATIC_PATH + "pickle/KEGG_DESCRIPTION.pickle"
    kegg_dict = get_pickle(kegg_path)
    egg_path = STATIC_PATH + "pickle/eggNOG_LEVELS.pickle"
    eggNOG_DICT = get_pickle(egg_path)
    egg_levels = {}

    ### Analysis
    analysis = {}
    if cluster:
        # Retrieve unigenes and store Newick in results/ dir
        unigene_list = get_unigenes_and_tree(query,
                                             RESULTS_PATH,
                                             client)
        print(len(unigene_list))
        for unigene in unigene_list:
            analysis[unigene] = neighbor_analysis(unigene,
                                                  unique_contigs=False,
                                                  json=False)
        # analysis = dumps(analysis)
    elif isList:
        for q in query:
            analysis[q] = neighbor_analysis(q,
                                            unique_contigs=False,
                                            json=False)
        query = "_".join(query)
        # analysis = dumps(analysis)
    else:
        analysis = neighbor_analysis(query, unique_contigs=True, json=False)
    # save dictionary as pickle file
    eggLEV_path = RESULTS_PATH + 'eggNOG_LEVELS.txt'
    with open(eggLEV_path, 'w') as handle:
        dump(egg_levels, handle)
    analysis_path = RESULTS_PATH + query + '.txt'
    with open(analysis_path, 'w') as handle:
        dump(analysis, handle)
    if json:
        analysis = dumps(analysis)
    return analysis



# def main():
    # ### Arguments
    # gmgc = sys.argv[1]
    # launch_analysis(gmgc)

# if __name__ == main():
    # main()
