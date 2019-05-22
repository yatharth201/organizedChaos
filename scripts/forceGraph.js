// underscore means unhidden and no underscore means not hidden (Throughout the file)


// Initialise variables that are used in the functions
var width = 700,
    height = 650,
    year = 1910,
    begin_year = 1910,
    end_year = 2010,
    year_tick = true,
    click_while_tick = false,
    root,
    edges,
    force,
    svg,
    div,
    link,
    node,
    fisheye;

// Create the force layout and the svg item individually and append them to the div named chart in the html file
function init() {
    fisheye = d3.fisheye.circular()
        .radius(200)
        .distortion(2);
    
    force = d3.layout.force()
        .size([width, height])
        .on("tick", tick);
    
    svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height);
    
    svg.on("mousemove", function() {
        fisheye.focus(d3.mouse(this));
    
        node.each(function(d) { d.fisheye = fisheye(d); })
            .attr("cx", function(d) { return d.fisheye.x; })
            .attr("cy", function(d) { return d.fisheye.y; })
            .attr("r", function(d) { return (d.fisheye.z)*4.5 });
    
        link.attr("x1", function(d) { return d.source.fisheye.x; })
            .attr("y1", function(d) { return d.source.fisheye.y; })
            .attr("x2", function(d) { return d.target.fisheye.x; })
            .attr("y2", function(d) { return d.target.fisheye.y; });
    });
        
    // Define the div for the tooltip
    div = d3.select("#chart").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);
        
    // Store all the objects which have the link or node class associated with them
    link = svg.selectAll(".link");
    node = svg.selectAll(".node");
     
    // Read in edges    
    d3.json("./data/edges.json", function(error, json) {
        if (error) throw error;
        edges = json;
    });
    
    // Read in nodes
    d3.json("./data/nodes.json", function(error, json) {
      if (error) throw error;
      root = json;
      update();
    });
}


// Render the graph for all visible nodes    
function update() {
    // Check if the slider is ticking (updating each second)
    if (year_tick) {
        updateYear();
    }
    
    // Change the value of the slider and year in the html
    document.getElementById("myRange").value = year - begin_year;
    document.getElementById("yearbox").innerHTML = year;
    
    // Call visible nodes to set the correct list of nodes
    var nodes = visibleNodes(),
        links = [];
     
    
    // Add all edges
    for (var i = 0; i < edges.edgeList.length; i++) {
        var s, t;
        
        // Look for source in nodes
        if (edges.edgeList[i]["source"]) {
            s = root[edges.edgeList[i]["source"]];    
        }
        
        // Look for target in nodes
        if (edges.edgeList[i]["target"]) {
            t = root[edges.edgeList[i]["target"]];
        }
    
        // If the edge is a valid edge, add it to the list of edges in the required format
        if (s != null && t != null) {
            links.push({
                "source":s,
                "target":t,
                "relation": edges.edgeList[i]["relation"],
                "distance": 36
            });    
        }
    }

    // Restart the force layout.
    force
        .nodes(nodes)
        .links(links)
        .linkDistance(d => d.distance)
        .start();

    // Update the links…    
    link = link.data(links, function(d) { return d.target.id; });

    // Exit any old links.
    link.exit().remove();

    // Enter any new links.
    link.enter().insert("line", ".node")
        .attr("class", "link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; })
        .style("stroke", function(d) {
                if ( (d.relation).localeCompare("sibling") == 0) {
                    return "#ECA400";
                } else if ( (d.relation).localeCompare("marriage") == 0) {
                    return "#CA61C3";
                } else if ( (d.relation).localeCompare("parent-child") == 0) {
                    return "#DA2647";
                }
            }) // colour the line
        .style('stroke-width', 3); // colour the line

    // Update the nodes…
    node = node.data(nodes, function(d) { return d.id; }).style("fill", color);

    // Exit any old nodes.
    node.exit().remove();
    
    // Enter any new nodes.
    node.enter().append("circle")
        .attr("class", "node")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", function(d) { 
            if (d.relations) {
                return 8 + d.relations.length; 
            } else {
                return 5;
            }
        })
        .style("fill", color)
        .style("stroke", "white")
        .on("click", click)
        .on("mouseover", function(d) {		
            div.transition()		
                .duration(200)		
                .style("opacity", .9);		
            div	.html(d.first_name + "<br/>" + d.last_name)	
                .style("left", (d.x-15) + "px")		
                .style("top", (d.y+40) + "px");	
            })					
        .on("mouseout", function(d) {		
            div.transition()		
                .duration(500)		
                .style("opacity", 0);	
        })
        .call(force.drag);
    
    // If we have reached the last year, stop ticking
    if (year >= end_year) {
        year_tick = false;
    }  
    
    // After every 500 milliseconds, increase the year count by 1
    setTimeout(function() {
        if (year_tick && click_while_tick) {
            click_while_tick = false;
        } else if (year_tick) {
            year++;
            update();
        }
    }, 500); 
}

// Check if any new nodes need to be added to our current list or if any nodes need to be removed
function updateYear() {
    for (var i = 0; i < root.id_list.length ; i++) {
        if  (root[root.id_list[i]]) {
            if (root[root.id_list[i]].year_entry >= year) {
                //hide node
                root["_" + root.id_list[i]] = root[root.id_list[i]];
                root[root.id_list[i]] = null;
            }
        } else {
            if (root["_" + root.id_list[i]].year_entry < year) {
                //Unhide node
                root[root.id_list[i]] = root["_" + root.id_list[i]];
                root["_" + root.id_list[i]] = null;
            }
        }
    }
}

function tick() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
}


// Color leaf nodes based on primary profession
function color(d) {
    
    var res = d.profession.split('/')
    
    if (res[0] == "actor") {
        return "#3C91E6";
    } else if (res[0] == "director") {
        return "#A2D729";
    } else if (res[0] == "producer") {
        return "#FA824C";
    } else {
        return "#AA4465";
    }
}

// Returns a list of all visible nodes under the root node
function visibleNodes() {
    var temp = [];
    for (var i = 0; i < root.id_list.length ; i++) {
        if  (root[root.id_list[i]]) {
            temp.push(root[root.id_list[i]]);
        }
    }
    return temp;
}

// Collapse function which collapses all nodes that are smaller than the node that was pressed
function recursiveHide(d) {
    // Hide block
    
    if (d.relations && d.relations.length != 0) {
        for (var i = 0; i < d.relations.length; i++) {
            var total_relations = 0;
            if (root[d.relations[i]] == null) {
                continue;
            }
            // Add number of relations of the relation
            if (root[d.relations[i]] && root[d.relations[i]].relations) {
                total_relations += root[d.relations[i]].relations.length;
            }    
        
            // Add number of hidden relations of the relation
            if (root[d.relations[i]] && root[d.relations[i]]._relations) {
                total_relations += root[d.relations[i]]._relations.length;
            }
            
            //If he is less well connected than me, hide him and his relations
            if (total_relations < d.relations.length) {
                recursiveHide(root[d.relations[i]]);
            }
        }
        
        var main_node_len = d.relations.length;
        for (var i = 0; i < d.relations.length; i++) {
            if (root[d.relations[i]] == null || root[d.relations[i]].relations == null) {
                continue;
            }
            if (root[d.relations[i]].relations.length < main_node_len) {
                root["_" + d.relations[i]] = root[d.relations[i]];
                root[d.relations[i]] = null;
                if (d._relations == null) {
                    d._relations = [];
                }
                d._relations.push(d.relations[i]);
                d.relations.splice(i,1);
                i--;
            }
        }
    }  
}

// Opposite of recursiveHide. Unhides all elements that were previously collapsed
function recursiveUnhide(d) {
    if (d._relations && d._relations.length != 0) {
        for (var i = 0; i < d._relations.length; i++) {
            if (root["_" + d._relations[i]] == null) {
                continue;
            }
            if (root["_" + d._relations[i]]._relations && root["_" + d._relations[i]]._relations.length != 0) {
                recursiveUnhide(root["_" + d._relations[i]]);
            }    
        }
        
        for (var i = 0; i < d._relations.length; i++) {
            if (root["_" + d._relations[i]] == null) {
                continue;
            }
            
            root[d._relations[i]] = root["_" + d._relations[i]];
            root["_" + d._relations[i]] = null;
            if (d.relations == null) {
                d.relations = [];
            }
            d.relations.push(d._relations[i]);
            d._relations.splice(i,1);
            i--;
        }
    }
}

// Toggle children on click.
function click(d) {
    var search = d.first_name + " " + d.last_name;
    getWiki(search);
    if (!d3.event.defaultPrevented) {
        if (d._relations && d._relations.length > 0) {
            recursiveUnhide(d);
        } else {
            recursiveHide(d);
        }
        if (year_tick) {
            click_while_tick = true;
        }
        update();
    }
}

function slidePress() {
    year_tick = false;
    year = Number(document.getElementById("myRange").value) + begin_year;
}

// Update the current slider value (each time you drag the slider handle)
function slideRelease() {
    year = Number(document.getElementById("myRange").value) + begin_year;
    updateYear();
    update();
}

// Create a web request and send it to wikipedias api and obtain response
async function getWiki(search) {

    //Create an HTTP Request
    const Http = new XMLHttpRequest();

    //Base request url.
    var url='https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&prop=text&section=0&page=';

    //Concatenates search term to the url
    url = url + search;

    //Set the HTTP request and send it to the URL
    Http.open("GET", url);
    Http.send();

    //Wait for the request to be successful
    Http.onreadystatechange=(e)=>{
        if (Http.readyState === 4 && Http.status === 200) {
            
            //On success call the modifyPage function with the parameter of the response as a string
            var text = Http.responseText;
            modifyPage(text);
        }
    }
}

// Replace all links with thier appropriate counterparts
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};


// Take the response from the wikipedia api and display it on the screen
function modifyPage(search) {

	//Parse the response text into a JSON
	var data = JSON.parse(search);

	//Edit the wiki paragraph in the wikibox on the webpage
	if (data.parse) {
	    var text = data.parse.text["*"];
	    text = text.replaceAll('a href=\"', 'a href=\"http://www.wikipedia.org');
	    document.getElementById("wikiPara").innerHTML = text;
	} else {
	    document.getElementById("wikiPara").innerHTML = "Sorry, the person doesn't have a page on wikipedia...";
	}
}

