import sys
import json
from collections import defaultdict
from pymongo import MongoClient
import time

client = MongoClient('10.0.3.1')
db = client['mgv1']
col_emapper = db.emapper2
col_neighs = db.neighs
col_cards = db.card
col_fams = db.nfam_v2_members
col_taxonomy = db.genome_taxonomy

# Preloads taxonomy info per genome
def get_taxonomy(genome):
    match = col_taxonomy.find_one({'genome': genome})
    del match['_id']
    taxa = match['lineage'].split(';')
    fields = [
	'domain', 'phylum',
	'class', 'order',
	'family', 'genus',
	'species'
    ]
    taxonomy = []
    for idx, f in enumerate(fields):
        t = taxa[idx].split('_')[-1]
        if t == '_': t = ''
        taxonomy.append({'id':t, 'level':f})
    return taxonomy

def get_emapper_annotations(names):
    matches = col_emapper.find({'q_g': {'$in': names} })
    gene2annot = defaultdict(dict)
    for m in matches:
        del m['_id']
        ogs_by_level = []
        for og in m.get('ogs', []):
            name, level = og.split('@')
            ogs_by_level.append({'id':name, 'level':level})
            # ogs_by_level.setdefault(level, []).append(name)
        m['ogs'] = ogs_by_level
        kpath = []
        for kp in m.get('kpath', []):
            # Get kegg description
            kpath.append({'id':kp})
        m['kpath'] = kpath
        gene2annot[m['q_g']] = m

    return gene2annot

def get_mini_contig(gene_name, window=10):
    # finds the contig containing the gene, and retreives the whole contig array
    match = col_neighs.find_one(
        {"genes.g": gene_name},
        {"c":1, "genes":1})

    if match:
        # extract region from the whole contig
        anchor = next(x for x in match['genes'] if x['g'] == gene_name)['p']
        start = max(0, anchor-window)
        end = anchor+window
        return match['genes'][start:end]
    else:
        return []

def get_cards(names):
    matches = col_cards.find({'q_g': {'$in': names} })
    gene2card = defaultdict(list)
    for m in matches:
        gene2card[m['q_g']].append([m['card'], m['pident'], m['evalue']])
    return gene2card

def get_fam(fam):
    match = col_fams.find_one({'gf': fam})
    family_doc = {'gf': fam, 'neighs': [], 'size':match['nseqs'], 'ntaxa': match['nspcs']}
    neighborhood = []

    # process each member of the family
    for gene_entry in match['members']:
        src, genome, gene, taxa = gene_entry.split('@')

        # find taxa lineage by genome name
        taxa = get_taxonomy(genome)

        # First, give me neighbours and their positions/strands. The result includes the anchor
        window = 10
        mini_contig = get_mini_contig(gene, window=window)

        # extract gene names from the mini contig
        mini_contig_genes = list(set([n['g'] for n in mini_contig]))

        # query their annotations
        gene2annot = get_emapper_annotations(mini_contig_genes)
        gene2card = get_cards(mini_contig_genes)

        # creates a document with the extended info of each gene
        for orf in mini_contig:
            gene_doc = {"gene": orf['g'],
                        "anchor":gene,
                        "start":orf['s'],
                        "end":orf['e'],
                        "strand":orf['o'],
                        "pos": int(orf['p']) - (window+1),
                        "taxonomy":taxa,
                        "Orthologous groups": gene2annot[orf['g']].get('ogs', []),
                        "KEGG pathways": gene2annot[orf['g']].get('kpath', []),
                        "Gene name": gene2annot[orf['g']].get('pname', ''),
			# Best OG description
                        "Description": gene2annot[orf['g']].get('bod', ''),
                        #"emapper": gene2annot[orf['g']],
                        "CARD":gene2card[orf['g']]
                }
            neighborhood.append(gene_doc)
    family_doc['neighs'] = neighborhood
    return json.dumps(neighborhood)
    # return json.dumps(family_doc)

if __name__ == '__main__':
    t1 = time.time()
    query = sys.argv[1]
    fam_info = get_fam(query)
    etime = time.time()-t1
    print(fam_info)
    print("Time:", etime, file=sys.stderr)
