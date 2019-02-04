import 'es6-promise/auto';
import { sample } from 'lodash';
import Mustache from 'mustache';
import whenDomReady from 'when-dom-ready';
import bonzo from 'bonzo';
import * as d3 from 'd3';

// styles
import 'milligram';
import './index.pcss';

let svg;
const color = d3.scaleOrdinal(d3.schemeDark2);
const valueline = d3.line()
  .x(d => d[0])
  .y(d => d[1])
  .curve(d3.curveCatmullRomClosed);
const scaleFactor = 1.2;
let groupIds;
let simulation;
let node;
let paths;
let centroid;
let looptimeout; //eslint-disable-line
let data;

const handleSuccess = (graph) => { //eslint-disable-line
  data = graph;
  svg = d3.select('svg#alerts');
  const bbox = document.getElementById('alerts').getBoundingClientRect();
  const { width, height } = bbox;

  simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(() => 40))
    .force('charge', d3.forceManyBody().strength(() => -15).distanceMax(150))
    .force('center', d3.forceCenter(width / 2, height / 2));

  // create groups, links and nodes
  const groups = svg.append('g').attr('class', 'groups');

  const link = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(graph.links)
    .enter()
    .append('line')
    .attr('stroke-width', d => Math.sqrt(d.value));

  link.on('click', (a) => {
    clearTimeout(looptimeout);
    highlightLink(a);
    looptimeout = setTimeout(performNextIteration, 3000);
  });

  link.append('title').text(d => d.alerts.map(alert => `${alert.key}: ${alert.doc_count}`).join('\n'));

  node = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(graph.nodes)
    .enter()
    .append('circle')
    .attr('r', 5)
    .attr('fill', d => color(d.group));
  // .call(d3.drag()
  //   .on('start', dragstarted)
  //   .on('drag', dragged)
  //   .on('end', dragended));

  node.append('title').text(d => d.id);

  // count members of each group. Groups with less
  // than 3 member will not be considered (creating
  // a convex hull need 3 points at least)
  groupIds = d3.set(graph.nodes.map(n => +n.group))
    .values()
    .map(groupId => ({
      groupId,
      count: graph.nodes.filter(n => +n.group === +groupId).length
    }))
    .filter(group => group.count > 2)
    .map(group => +group.groupId);

  paths = groups.selectAll('.path_placeholder')
    .data(groupIds, d => +d)
    .enter()
    .append('g')
    .attr('class', 'path_placeholder')
    .append('path')
    .attr('stroke', d => color(d))
    .attr('fill', d => color(d))
    .attr('opacity', 0);

  paths
    .transition()
    .duration(2000)
    .attr('opacity', 1);

  // add interaction to the groups
  groups.selectAll('.path_placeholder')
    .call(d3.drag()
      .on('start', groupDragstarted)
      .on('drag', groupDragged)
      .on('end', groupDragended));

  simulation
    .nodes(graph.nodes)
    .on('tick', ticked)
    .force('link')
    .links(graph.links);

  function ticked() {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    updateGroups();
  }

  looptimeout = setTimeout(performNextIteration, 3000);
};

const performNextIteration = () => {
  const link = sample(data.links);
  highlightLink(link);

  looptimeout = setTimeout(performNextIteration, 3000);
};

const highlightLink = (highlightable) => {
  const template = document.getElementById('template').innerHTML;
  document.getElementById('highlight').innerHTML = Mustache.render(template, {
    from   : highlightable.source.id,
    to     : highlightable.target.id,
    alerts : highlightable.alerts
  });

  d3
    .selectAll('circle')
    .data(data.nodes)
    .attr('r', d => (d.id === highlightable.source.id || d.id === highlightable.target.id ? 8 : 5));

  d3
    .selectAll('line')
    .data(data.links)
    .attr('class', d => d == highlightable ? 'highlighted' : ''); //eslint-disable-line
};

// select nodes of the group, retrieve its positions
// and return the convex hull of the specified points
// (3 points as minimum, otherwise returns null)
function polygonGenerator(groupId) {
  const nodeCoords = node
    .filter(d => +d.group === +groupId)
    .data()
    .map(d => [d.x, d.y]);

  return d3.polygonHull(nodeCoords);
}

function updateGroups() {
  groupIds.forEach((groupId) => {
    const path = paths.filter(d => d === +groupId)
      .attr('transform', 'scale(1) translate(0,0)')
      .attr('d', (d) => {
        const polygon = polygonGenerator(d);
        centroid = d3.polygonCentroid(polygon);

        // to scale the shape properly around its points:
        // move the 'g' element to the centroid point, translate
        // all the path around the center of the 'g' and then
        // we can scale the 'g' element properly
        return valueline(
          polygon.map(point => [point[0] - centroid[0], point[1] - centroid[1]]) //eslint-disable-line
        );
      });

    d3.select(path.node().parentNode).attr('transform', `translate(${centroid[0]},${centroid[1]}) scale(${scaleFactor})`);
  });
}

// // drag nodes
// function dragstarted(d) {
//   if (!d3.event.active) simulation.alphaTarget(0.3).restart();
//   d.fx = d.x; //eslint-disable-line
//   d.fy = d.y; //eslint-disable-line
// }

// function dragged(d) {
//   d.fx = d3.event.x; //eslint-disable-line
//   d.fy = d3.event.y; //eslint-disable-line
// }

// function dragended(d) {
//   if (!d3.event.active) simulation.alphaTarget(0);
//   d.fx = null; //eslint-disable-line
//   d.fy = null; //eslint-disable-line
// }

// drag groups
function groupDragstarted() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d3.select(this).select('path').style('stroke-width', 3);
}

function groupDragged(groupId) {
  node
    .filter(d => +d.group === +groupId)
    .each((d) => {
      d.x += d3.event.dx; //eslint-disable-line
      d.y += d3.event.dy; //eslint-disable-line
    });
}

function groupDragended() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d3.select(this).select('path').style('stroke-width', 1);
}

const handleError = (error) => {
  const para = bonzo(document.createElement('p'))
    .text(`Error - ${error.message}!`)
    .addClass('error');
  bonzo(document.getElementById('alerts'))
    .after(para);
};

const endpoint = `${window.location.protocol}//${window.location.hostname}:4567`;

fetch(endpoint, {})
  .then(response => response.json())
  .then(whenDomReady.resume())
  .then(handleSuccess, handleError);

window.setTimeout(() => window.location.reload(), 60 * 1000);
