function scale(num, inSize, outSize) {
    return +num * outSize / inSize;
}
function draw_seqLine(g, width, height) {
    g.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("x1", 0)
        .attr("y1", height / 2)
        .attr("x2", width)
        .attr("y2", height / 2);
}
function draw_domains(g, lenseq, domains, width, height) {
    g.selectAll('rect')
        .data(domains)
        .enter().append('rect')
        .attr("x", function (d) { return scale(d.start, lenseq, width); })
        .attr("y", 0)
        .attr("width", function (d) { return scale(+d.end - +d.start, lenseq, width); })
        .attr("height", height)
        .attr("fill", "orange");
}
export function draw_protDomains(id, lenseq, domains, width, height) {
    var g = d3.select('#' + id).append('svg:svg');
    draw_seqLine(g, width, height);
    draw_domains(g, lenseq, domains, width, height);
}
