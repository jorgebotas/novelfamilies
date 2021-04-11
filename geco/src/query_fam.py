from collections import defaultdict, Counter
from django.conf import settings
from ete3 import Tree
import json
import pickle
from pymongo import MongoClient, ASCENDING, DESCENDING
import sys
import time

client = MongoClient('10.0.3.1')
db = client['mgv1']
col_emapper = db.emapper2
col_neighs = db.neighs
col_cards = db.card
col_fams = db.nfam_v2_members
col_faminfo = db.faminfo
col_taxonomy = db.genome_taxonomy
col_og_neigh_scores = db.og_neigh_scores
col_proteins = db.proteins
col_trees = db.trees
col_signalp = db.signalp
col_tm = db.tm

DOCS_PER_PAGE = 10

STATIC_PATH = settings.BASE_DIR + '/static/geco/'

def get_pickle(filePath):
    """
    Return dict contained in pickle file

    :filePath: path to pickle file
    :returns: dictionary
    """
    with open(filePath, 'rb') as pickle_in:
        pdict = pickle.load(pickle_in)
    return pdict

kegg_dict = get_pickle(STATIC_PATH + "pickle/KEGG_DESCRIPTION.pickle")

def get_sequence(query, fasta=True):
    seq = col_proteins.find_one({'n': query}).get('aa', 'Sequence not found')
    if fasta:
        return '>{}\n{}'.format(query, seq)
    return seq

# Preloads taxonomy info per genome
def get_taxonomy(genome, json=True):
    match = col_taxonomy.find_one({'genome': genome})
    del match['_id']
    taxa = match['lineage'].split(';')
    parsed_taxa = []
    for idx, t in enumerate(taxa):
        if t[-1] == '_':
            continue
        tsplit = t.strip().split(' ')
        print(tsplit)
        # Clean cases where species name includes genus
        if idx > 0 and len(tsplit) > 1\
                and parsed_taxa[idx-1].strip() == tsplit[0].strip():
            t = tsplit[1]
        parsed_taxa.append(t)
    if not json:
        return ";".join(parsed_taxa)
    fields = [
	'domain', 'phylum',
	'class', 'order',
	'family', 'genus',
	'species'
    ]
    taxonomy = []
    for idx, t in enumerate(parsed_taxa):
        t = t.split('_')[-1]\
            .replace('.', '')\
            .replace(r'\s', '_')
        taxonomy.append({'id':t, 'level':fields[idx]})
    return taxonomy

def get_emapper_annotations(names):
    matches = col_emapper.find({'q_g': {'$in': names} })
    gene2annot = defaultdict(dict)
    for m in matches:
        del m['_id']
        ogs_by_level = []
        for og in m.get('ogs', []):
            name, level = og.split('@')
            ogs_by_level.append({'id':name,
                                 'level':level,
                                 'description':get_egg_description(name)
                                 })
            # ogs_by_level.setdefault(level, []).append(name)
        m['ogs'] = ogs_by_level
        kpath = []
        for kp in m.get('kpath', []):
            # Get kegg description
            try:
                desc = kegg_dict[kp[-5:]]
            except:
                desc = ""
            kpath.append({'id':kp,
                          'description': desc})
        m['kpath'] = kpath
        kos = []
        for ko in m.get('kos', []):
            # Get kegg description
            try:
                desc= ''
                # desc = kegg_dict['0'+str(ko[-4:])]
            except:
                desc = ""
            kos.append({'id':ko,
                          'description': desc})
        m['kos'] = kos

        gene2annot[m['q_g']] = m
    return gene2annot

def get_egg_description(eggnog):
    """
    Get eggnog OG description

    :eggnog: eggNOG id (OG)
    :db: MongoDB
    :returns: string with description,
              empty string if not found
    """
    try:
        description = client.gmgc_unigenes.eggnog_v5.find({"e" : eggnog})[0]["d"]
    except:
        description = ""
    return description

def get_mini_contig(gene_name, window=10):
    # finds the contig containing the gene, and retreives the whole contig array
    match = col_neighs.find_one(
        {"genes.g": gene_name},
        {"c":1, "genes":1})
    # Fix unordered contig problem
    sorted_genes = sorted(match['genes'], key=lambda x: x['s'])
    for pos, g in enumerate(sorted_genes):
        g['p'] = pos

    if match:
        # extract region from the whole contig
        anchor = next(pos for pos, g in enumerate(sorted_genes) if g['g'] == gene_name)
        start = max(0, anchor-window)
        end = min(anchor+window+1, len(match['genes']))
        mini_contig = sorted_genes[start:end]
        for orf in mini_contig: orf['p'] = orf['p'] - anchor
        return mini_contig
    else:
        return []

def get_cards(names):
    matches = col_cards.find({'q_g': {'$in': names} })
    gene2card = defaultdict(list)
    for m in matches:
        # gene2card[m['q_g']].append([m['card'], m['pident'], m['evalue']])
        gene2card[m['q_g']].append({'id' : m['card']})
    return gene2card

def fams_by_neigh_annotation(term_type, term, score=0.9, page=0):
    # term_type, one of: og, kos, CARD, kpath, pname
    matched_fams = []
    fam2score = {}
    fams = col_og_neigh_scores.find({term_type: {'$elemMatch': {
                                                'n': term,
                                                'score':{'$gte': score},
                                                'opposite_strand':'0',
                                                }}
                                 })
                                # .sort({'_id':1})\
                                # .skip(pagination[0])\
                                # .limit(pagination[1])
    for fam in fams:
        matched_fams.append(fam['fam'])
        annot_match = next(annot for annot in fam[term_type] if annot['n'] == term)
        fam2score[fam['fam']] = (annot_match['n'], annot_match['score'])
        matched_fams.append(fam['fam'])
        og_match = next(og for og in fam[term_type] if og['n'] == term)
        fam2score[fam['fam']] = (og_match['n'], og_match['score'])
    # collects more info from the families
    fams = col_faminfo.find({'name': {'$in': matched_fams},
                             'emapper_hits': {'$eq': 0}},
                            {'_id': 0})\
        .sort([('n_taxa', DESCENDING),
               ('name', ASCENDING)])\
        .skip(max((page-1)*DOCS_PER_PAGE, 0))\
        .limit(DOCS_PER_PAGE)
    total_matches = fams.count()
    matches = []
    for fam in fams:
        fam['match'] = fam2score[fam['name']]
        matches.append(fam)
    #selected_fams.sort(key=lambda x: x['n_taxa'], reverse=True)
    matches = get_more_faminfo(matches)
    matches = { m['name'] : m for m in matches }
    return matches, total_matches

def fams_by_taxa(taxa, spec=0.9, cov=0.9, page=0):
    matches = []
    fams = col_faminfo.find({'clade_counter': {'$elemMatch': {
                                                'term':taxa,
                                                'specificity':{'$gte': spec},
                                                'coverage':{'$gte': cov}}},
                             'emapper_hits': {'$eq': 0}})\
            .sort([('n_taxa', DESCENDING),
                   ('name', ASCENDING)])\
            .skip(max((page-1)*DOCS_PER_PAGE, 0))\
            .limit(DOCS_PER_PAGE)
    total_matches = fams.count()
    for fam in fams:
        clade_match = next(clade for clade in fam['clade_counter'] if clade['term'] == taxa)
        del fam['_id']
        del fam['clade_counter']
        fam['clade_info'] = clade_match
        matches.append(fam)
    matches = get_more_faminfo(matches)
    matches = { m['name'] : m for m in matches }
    return matches, total_matches

def get_newick(fam):
    match = col_trees.find_one({'fam': fam}) or {}
    tree = match.get('tree', False)
    if not tree: return False
    tree = Tree(tree)
    for leaf in tree.iter_leaves():
        lname = str(leaf.name).replace(' ', '_')
        nsplit = lname.split('.')
        showName = nsplit[0] + nsplit[1]
        name = showName.split('@')[2]
        tax = nsplit[2:]
        leaf.name = '.'.join([showName, name, *tax])
    return tree.write()

def get_neighborhood(fam, members=None):
    if not members:
        members = col_fams.find_one({'gf': fam}) or {}
        members = members.get('members' ,[])
    neighborhood = []
    # process each member of the family
    for gene_entry in members:
        src, genome, gene, tax = gene_entry.split('@')
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
                        "anchor": gene,
                        "start": orf['s'],
                        "end": orf['e'],
                        "strand": orf['o'],
                        "pos": orf['p'],
                        "taxonomy": taxa,
                        "Orthologous groups": gene2annot[orf['g']].get('ogs', []),
                        "KEGG pathways": gene2annot[orf['g']].get('kpath', []),
                        "KEGG orthologues": gene2annot[orf['g']].get('kos', []),
                        "Gene name": gene2annot[orf['g']].get('pname', ''),
			# Best OG description
                        "Description": gene2annot[orf['g']].get('bod', ''),
                        #"emapper": gene2annot[orf['g']],
                        "CARD": gene2card[orf['g']],
                        "seqID": "@".join([src, genome, orf['g'], tax])
                }
            neighborhood.append(gene_doc)
    return neighborhood

def get_domains(topology, signalp=[]):
    domains = []
    for sp in signalp:
        if sp != "OTHER" and sp != '':
            domains.append({
                'c' : 0,
                'class' : sp,
                'shape' : 'circle'
            })
    if len(topology) > 1:
        topo = str(topology).split('-')
        for i in range(1, len(topo)):
            p = str(topo[i-1])
            c = str(topo[i])
            try :
                start = int(p[-2:])
            except:
                start = int(p[-1])
            try:
                end = int(c[:2])
            except:
                end = int(c[0])
            domains.append({
                'start' : start,
                'end' : end,
                'class' : 'helix',
                'shape' : 'rect'
            })
    return domains

def get_more_faminfo(fams):
    fnames = [f['name'] for f in fams]
    # Signal peptides
    signalp = col_signalp.find({'fam': {'$in': fnames}}, {'_id': 0})
    signalp = { s['fam']: s for s in signalp }
    # Transmembrane domains
    transm = col_tm.find({'fam': {'$in': fnames}}, {'_id': 0})
    transm = { t['fam']: t for t in transm }
    extended_fams = []
    for fam in fams:
        ext_fam = fam
        fname = fam['name']
        sp = signalp.get(fname, {})
        ext_fam['signalp'] = sp
        tm = transm.get(fname, {})
        ext_fam['mean_nh'] = tm.get('mean_nh', '0')
        tm = tm.get('per_g_pred', {})
        domains = []
        taxonomy = []
        for m in fam['members']:
            # Topology
            m_topo = tm.get(m, {'top':''})['top']
            m_sp = list(sp['genes'].get(m, {}).values())
            domains.append({
                'gene': m,
                'doms': get_domains(m_topo, m_sp),
                'lenseq': 1000
            })
            # Taxonomy
            genome =  m.split('@')[1]
            tax = get_taxonomy(genome, json=False)
            taxonomy.append(tax)
        ext_fam['domains'] = domains
        tax_counter = Counter(taxonomy)
        taxonomy = list(zip(tax_counter.keys(),
                            tax_counter.values()))
        ext_fam['taxonomy'] = taxonomy
        extended_fams.append(ext_fam)
    return extended_fams

def get_fam(fam):
    fam_info = col_faminfo.find_one({'name': fam})
    del fam_info['_id']
    # Get neighborhood
    fam_info['neighs'] = get_neighborhood(fam, fam_info['members'])
    fam_info = get_more_faminfo([fam_info])[0]
    return fam_info

if __name__ == '__main__':
    t1 = time.time()
    query = sys.argv[1]
    fam_info = get_fam(query)
    etime = time.time()-t1
    print(fam_info)
    print("Time:", etime, file=sys.stderr)
