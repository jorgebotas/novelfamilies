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

def get_sequences(query, fasta=True):
    members = (col_fams.find_one({'gf': query}) or {}).get('members', [])
    seqs = col_proteins.find({'n': { '$in': members }})
    multifasta = ""
    for s in seqs:
        multifasta += '>{}\n{}\n'.format(s['n'], s['aa'])
    return multifasta

def get_neigh_sequences(query, fasta=True):
    src, genome, gene, tax = query.split('@')
    # First, retrieve neighbours and their positions/strands. The result
    # includes the anchor
    window = 10
    mini_contig = get_mini_contig(gene, window=window)
    # extract gene names from the mini contig
    mini_contig_genes = ["@".join([src,
                                   genome,
                                   n['g'],
                                   tax]) for n in mini_contig]
    # Retrieve their sequences
    seqs = col_proteins.find({'n': { '$in': mini_contig_genes }})
    seqs = sorted(seqs, key=lambda s: mini_contig_genes.index(s['n']))
    multifasta = ""
    for s in seqs:
        multifasta += '>{}\n{}\n'.format(s['n'], s['aa'])
    return multifasta

def get_hmm(query):
    return ""

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
        # Clean cases where species name includes genus
        if idx > 0 and len(tsplit) > 1\
            and parsed_taxa[idx-1].split('_')[-1] == tsplit[0].split('_')[-1]:
            t = 's__' + tsplit[1]
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
    for idx, t in enumerate(taxa):
        if t[-1] == '_':
            continue
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

def fams_by_neigh_annotation(term_type, term, min_rel_dist=1, score=0.9, page=0):
    # term_type, one of: og, kos, CARD, kpath, pname
    matched_fams = []
    fam2score = {}
    opposite_strand = 0
    def is_full_match(hit):
        if hit['n'] == term and \
           abs(hit['pos']) <= min_rel_dist and \
           hit['mean_num_in_opposite_strand'] == opposite_strand and \
           hit['mean_num_pos_opposite_strand_between'] == opposite_strand and \
           hit['num_h_dis'] == 0:
            return True
        else:
            # print(hit['pos'], hit['n'])
            return False
    for fam in col_og_neigh_scores.find({term_type: {'$elemMatch': {
                                                'n': term,
                                                'score':{'$gte': score},
                                                }}}):
        try:
            term_match = next(hit for hit in fam[term_type] if is_full_match(hit))
        except StopIteration:
            continue
        else:
            matched_fams.append(fam['fam'])
            fam2score[fam['fam']] = (term_match['n'], term_match['score'])
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
        src, genome, gene, tax = lname.split('@', 3)
        tax = tax.split('.', 1)[0]
        # find taxa lineage by genome name
        taxa = get_taxonomy(genome, json=False)
        taxonomy = [ t[3:].replace('.', '_').replace(' ', '_')
                for t in taxa.split(";") ]
        full_name = "@".join([src, genome, gene, tax]).replace('.', '_')
        last_tax = taxonomy[-1]
        leaf.name = '.'.join([last_tax,
                              full_name,
                              gene.replace('.', '_'),
                              *taxonomy])
    return tree.write()

def get_neighborhood_summary(fam):
    neighs = col_og_neigh_scores.find_one({'fam': fam}, {'_id': 0, 'fam': 0})
    summary = {}
    keys = {
        "og": "Orthologous groups",
        "kos": "KEGG orthologues",
        "kpath": "KEGG pathways"
        "Kmods": "KEGG modules",
        "pname": "Gene name",
        "pfam": "Pfam",
        "CARD": "CARD",
    }
    for k, v in neighs.items():
        key = keys[k]
        for t in v:
            pos = t['pos']
            term = t['n']
            score = t['score']
            strand_int = t['mean_num_in_opposite_strand']
            if strand_int == 1:
                strand = "-"
            else:
                strand = "+"
            gene = summary.setdefault(pos, {'anchor': fam, 'pos':pos, 'strand': []})
            gene['strand'].append(strand)
            gene.setdefault(key, []).append({'id': term, 'description': f'score: {score}'})
    summary = list(summary.values())
    # Get most repeated strand
    for s in summary:
        s['strand'] = max(set(s['strand']), key=s['strand'].count)
    summary.append({ "anchor": fam, "pos": 0, "strand": "+" })
    return summary

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
            gene_doc = {"gene": orf['g'].replace('.', '_'),
                        "anchor": gene.replace('.', '_'),
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
        ext_fam['context_summary'] = get_neighborhood_summary(fname)
        extended_fams.append(ext_fam)
    return extended_fams

def get_fams(fnames, page=1):
    fam_info = list(col_faminfo.find({'name': {'$in': fnames}}, {'_id': 0}))
    fam_info = get_more_faminfo(fam_info)
    fam_info_paged = fam_info[(page-1)*DOCS_PER_PAGE:page*DOCS_PER_PAGE]
    fam_info_paged = { m['name'] : m for m in fam_info_paged }
    total_matches = len(fam_info)
    return fam_info_paged, total_matches

if __name__ == '__main__':
    t1 = time.time()
    query = sys.argv[1]
    fam_info = get_fam(query)
    etime = time.time()-t1
    print(fam_info)
    print("Time:", etime, file=sys.stderr)
