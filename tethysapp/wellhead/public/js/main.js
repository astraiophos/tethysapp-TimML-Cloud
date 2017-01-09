/*****************************************************************************
 * FILE:    main.js
 * DATE:    12/16/2016
 * AUTHOR:  Jacob Fullerton
 * COPYRIGHT: (c) 2016 Brigham Young University
 * LICENSE: BSD 2-Clause
 * CONTRIBUTIONS:   http://openlayers.org/
 *
 *****************************************************************************/

/*****************************************************************************
 *                              Functions
 *****************************************************************************/

var initialize_timml_layers;
var drawing_listener;
var build_table;
var addRow;
var deleteRow;
var timml_solution;

/*****************************************************************************
 *                             Variables
 *****************************************************************************/

//  TimML Layers, header lists
var model_constant_layer;
var line_sink_layer;
var head_line_sink_layer;
var res_line_sink_layer;
var line_doublet_imp_layer;
var line_sink_ditch_layer;
var polygon_inhom_layer;
var wells_layer;
var $id = 0;

/*****************************************************************************
 *                              Main Script
 *****************************************************************************/

//  Once the user has defined their features with the corresponding attributes, collect all features and prepare data
//  for export to timml controller function. When the results are passed back, create two new layers to represent
//  the groundwater elevations (using contours and a grid, respectively).

timml_solution = function(){
    //  Used to read in the information from the interface
    var map;
    var layer;
    var features;
    var attributes;

    //  Need to know the size of the map to the edges
    var map_window;

    //  Used to store the model information and pass to the controller
    var model_ = {};
    var constant_ = {};
    var uflow_ = {};
    var wells_ = {};
    var linesink_ = {};
    var headlinesink_ = {};
    var reslinesink_ = {};
    var linesinkditch_ = {};
    var linedoubletimp_ = {};
    var polygoninhom_ = {};

    //  Initialize the map object and get map size
    map = TETHYS_MAP_VIEW.getMap();
    map_window = map.getView().calculateExtent(map.getSize());

    // ***   Model information   *** //
    layer = map.getLayers().item(9);
    features = layer.getSource().getFeatures();

    //  Check that the model only has at least one constant, return if false
    if (features.length === 1){}
    else{
        error_message("Make sure that you have only one constant");
        return;
    }

    //  Get the properties of the model
    model_["k"] = features[0].getProperties()["k"];
    model_["zb"] = features[0].getProperties()["zb"];
    model_["zt"] = features[0].getProperties()["zt"];
    model_["c"] = features[0].getProperties()["c"];
    model_["n"] = features[0].getProperties()["n"];
    model_["nll"] = features[0].getProperties()["nll"];

    //  Get the coordinates and properties of the constant
    constant_["coordinates"] = features[0].getGeometry().getCoordinates();
    constant_["head"] = features[0].getProperties()["constant head"];
    constant_["layer"] = features[0].getProperties()["constant layer"];
    constant_["label"] = features[0].getProperties()["Label"];

    //  Get ambient flow conditions if user created input
    if (features[0].getProperties()['uflow grad'] != "" && features[0].getProperties()["uflow angle"] != ""){
        uflow_["uflow grad"] = features[0].getProperties()["uflow grad"];
        uflow_["uflow angle"] = features[0].getProperties()["uflow angle"];
    }

    // ***   Well(s) data   *** //
    layer = map.getLayers().item(8);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'Qw': features[i].getProperties()['Qw'],
                'rw': features[i].getProperties()['rw'],
                'layers': features[i].getProperties()['layers'],
                'label': features[i].getProperties()['Label']
            });

            wells_[String("well_" + i)] = attributes[i];
        };
    }
//    console.log("Here's the wells_ before handoff: ");
//    console.log(wells_);

    // ***   Line Sink data   *** //
    layer = map.getLayers().item(7);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'sigma': features[i].getProperties()['sigma'],
                'layers': features[i].getProperties()['layers'],
                'label': features[i].getProperties()['Label']
            });

            linesink_[String("line_sink_" + i)] = attributes[i];

            //  If coordinates of any feature is longer than 2, cancel solve request and notify user
            if (linesink_['line_sink_' + i]['coordinates'].length>2){
                error_message("Feature '" + features[i].getProperties()['Label']+  "' has more than 2 vertices. " +
                "Please break up your feature to have only 2 vertices");
                return;
            }
        };
    }


    // ***   Head Line Sink data   *** //
    layer = map.getLayers().item(6);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'head': features[i].getProperties()['head'],
                'layers': features[i].getProperties()['layers'],
                'label': features[i].getProperties()['Label']
            });

            headlinesink_[String("head_line_sink_" + i)] = attributes[i];

            //  If coordinates of any feature is longer than 2, cancel solve request and notify user
            if (headlinesink_['head_line_sink_' + i]['coordinates'].length>2){
                error_message("Feature '" + features[i].getProperties()['Label']+  "' has more than 2 vertices. " +
                "Please break up your feature to have only 2 vertices");
                return;
            }
        };
    }

    // ***   Res Line Sink data   *** //
    layer = map.getLayers().item(5);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'head': features[i].getProperties()['head'],
                'res': features[i].getProperties()['res'],
                'width': features[i].getProperties()['width'],
                'layers': features[i].getProperties()['layers'],
                'bottomelev': features[i].getProperties()['bottomelev'],
                'label': features[i].getProperties()['Label']
            });

            reslinesink_[String("res_line_sink_" + i)] = attributes[i];

            //  If coordinates of any feature is longer than 2, cancel solve request and notify user
            if (reslinesink_['res_line_sink_' + i]['coordinates'].length>2){
                error_message("Feature '" + features[i].getProperties()['Label']+  "' has more than 2 vertices. " +
                "Please break up your feature to have only 2 vertices");
                return;
            }
        };
    }

    // ***   Line Doublet Imp data   *** //
    layer = map.getLayers().item(4);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'order': features[i].getProperties()['order'],
                'layers': features[i].getProperties()['layers'],
                'label': features[i].getProperties()['Label']
            });

            linedoubletimp_[String("line_doublet_imp_" + i)] = attributes[i];
            //  If coordinates of any feature is longer than 2, cancel solve request and notify user
            if (linedoubletimp_['line_doublet_imp_' + i]['coordinates'].length>2){
                error_message("Feature '" + features[i].getProperties()['Label']+  "' has more than 2 vertices. " +
                "Please break up your feature to have only 2 vertices");
                return;
            }
        };
    }

    // ***   Line Sink Ditch data   *** //
    layer = map.getLayers().item(3);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'Q': features[i].getProperties()['Q'],
                'res': features[i].getProperties()['res'],
                'width': features[i].getProperties()['width'],
                'layers': features[i].getProperties()['layers'],
                'label': features[i].getProperties()['Label']
            });

            linesinkditch_[String("line_sink_ditch_" + i)] = attributes[i];
            //  If coordinates of any feature is longer than 2, cancel solve request and notify user
            if (linesinkditch_['line_sink_ditch_' + i]['coordinates'].length>2){
                error_message("Feature '" + features[i].getProperties()['Label']+  "' has more than 2 vertices. " +
                "Please break up your feature to have only 2 vertices");
                return;
            }
        };
    }

    // ***   Polygon Inhom data *** //
    layer = map.getLayers().item(2);
    features = layer.getSource().getFeatures();

    //  Skip if there aren't any features to process
    if (features.length === 0){}
    else{
        attributes = [];
        for (i=0;i<features.length;i++){
            //  Credit to @Darin Dimitrov on stackoverflow.com for this nested JSON structure
            attributes.push({
                'coordinates': features[i].getGeometry().getCoordinates(),
                'Naquifers': features[i].getProperties()['Naquifers'],
                'k': features[i].getProperties()['k'],
                'zb': features[i].getProperties()['zb'],
                'zt': features[i].getProperties()['zt'],
                'c': features[i].getProperties()['c'],
                'n': features[i].getProperties()['n'],
                'nll': features[i].getProperties()['nll'],
                'order': features[i].getProperties()['order'],
                'label': features[i].getProperties()['Label']
            });

            polygoninhom_[String("polygoninhom_" + i)] = attributes[i];
        };
    }


    //  Pass information to controller for processing, to be passed back and read in as two layers
    //  Also prevent user from clicking and add visual cue that information is being processed

    function handler(e){
        e.stopPropagation();
        e.preventDefault();
    }
    $('#loading').removeClass("hidden");

    document.addEventListener("click",handler,true);

    $.ajax({
		type: 'GET',
		url: 'timml',
		dataType: 'json',
		data: {
            "model":JSON.stringify(model_),
            "constant":JSON.stringify(constant_),
            "uflow":JSON.stringify(uflow_),
            "wells":JSON.stringify(wells_),
            "line_sink":JSON.stringify(linesink_),
            "head_line_sink":JSON.stringify(headlinesink_),
            "res_line_sink":JSON.stringify(reslinesink_),
            "line_doublet_imp":JSON.stringify(linedoubletimp_),
            "line_sink_ditch":JSON.stringify(linesinkditch_),
            "polygon_inhom":JSON.stringify(polygoninhom_),
            //  Map Information
            "map_corners":JSON.stringify(map_window),
			},
			success: function (data){
//					console.log(data);
//					console.log("Here's what's passed back: ");
//					console.log(JSON.parse(data.wells));
					if (data.error){
						console.log(data.error);
						document.removeEventListener("click",handler,true);
                        $('#loading').addClass("hidden");
						return
					}
//					waterTableRegional = (JSON.parse(data.local_Water_Table));
////					console.log(waterTableRegional);
//
//					var raster_elev_mapView = {
//						'type': 'FeatureCollection',
//						'crs': {
//							'type': 'name',
//							'properties':{
//								'name':'EPSG:4326'
//								}
//						},
//						'features': waterTableRegional
//					};
//
					levels = (JSON.parse(data.heads));
					window.sessionStorage['levels'] = data.heads;

					Contours = (JSON.parse(data.contours));
//					console.log(Contours);

					var contourLines = {
						'type': 'FeatureCollection',
						'crs': {
							'type': 'name',
							'properties': {
								'name':'EPSG:4326'
							}
						},
						'features': Contours
					}

//					addWaterTable(raster_elev_mapView,"Water Table");
					addContours(contourLines,levels,"Elevation Contours");
                    document.removeEventListener("click",handler,true);
                    $('#loading').addClass("hidden");
					}
			});
};

//  #################################### Add the new water table contours to the map ###################################
function addContours(contourLines,levels,titleName){
    var getStyleColor;
    var map;
    var i;

    getStyleColor = function(value) {
        if (value == levels[0])
            return [0,0,0,1];			//	Black
        else if (value == levels[1])
            return [170,1,20, 1];		//	Red
        else if (value == levels[2])
            return [196,100,0,1];		//	Orange
        else if (value == levels[3])
            return [255,165,0,1];		//	Light Orange, Hex:ffa500
        else if (value == levels[4])
            return [255,255,0,1];		//	Yellow, Hex:FFFF00
        else if (value == levels[5])
            return [0,255,0,1];			//	Green
        else if (value == levels[6])
            return [0,218,157,1];		//	Turqoise(ish), Hex:00DA9D
        else if (value == levels[7])
            return [0,158,223,1];		//	Lighter Blue, Hex:009EDF
        else if (value == levels[8])
            return [1,107,231,1];		//	Light Blue, Hex:016BE7
		else
			return [0,32,229,1];		//	Blue, Hex:0020E5
    };

	//	Default style
	var defaultStyle = new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: [0,0,0,1],
			width: 2
			})
	});

    //This will be used to cache the style
    var styleCacheHead = {};

    function styleFunction(feature, resolution){
        //get the elevation from the feature properties
        var elevation = feature.get('elevation');
        //if there is no elevation value or it's one we don't recognize,
        //return the default style
        if(!elevation) {
            return [defaultStyle];
            }
        //check the cache and create a new style for the elevation if it's not been created before.
        if(!styleCacheHead[elevation]){
            var style_color = getStyleColor(elevation);
            styleCacheHead[elevation] = new ol.style.Style({
                stroke: new ol.style.Stroke({
                	color:style_color,
                	width:2
                	}),
                });
            }
    //at this point, the style for the current level is in the cache so return it as an array
        return [styleCacheHead[elevation]];
    }

    //	Reads in the contour lines as GeoJSON objects and creates an openlayers vector object
    var collection = contourLines;
    var format = new ol.format.GeoJSON();
    var vectorSource = new ol.source.Vector({
        features: format.readFeatures(collection,
        {featureProjection:"EPSG:4326"})
        });

	var vector = new ol.layer.Image({
		zIndex: 4,
		source: new ol.source.ImageVector({
			source: vectorSource,
			style: styleFunction,
		}),
	});

//	console.log(vector);

	//	Deletes the existing layer containing any old contourlines
    map = TETHYS_MAP_VIEW.getMap();
    for (i = 0; i < map.getLayers().getProperties().length ; i ++){
        if (map.getLayers().item(i).tethys_legend_title === titleName)
            map.removeLayer(map.getLayers().item(i));
    }

    vector.tethys_legend_title = titleName;
    vector.tethys_editable = false;
    map.addLayer(vector);

//    TETHYS_MAP_VIEW.updateLegend();

//    $('a.display-control').on("click", function(){
//        $(function() {
//            var map = TETHYS_MAP_VIEW.getMap();
//            if (!!map.getLayers().item(2)){
//                toggle_legend(map.getLayers().item(2).getProperties().visible,1);
//            };
//            if (!!map.getLayers().item(3)){
//                toggle_legend(map.getLayers().item(3).getProperties().visible,2);
//            }
//			if (!!map.getLayers().item(4)){
//                toggle_legend(map.getLayers().item(4).getProperties().visible,3);
//            }
//        })
//    });

//	toggle_legend(true,3,levels);
//	document.getElementById('loading').style.display = "none";

};

/*****************************************************************************
 *                    User Interaction and Attribute Table
 *****************************************************************************/

//  Add listeners for every new object created
drawing_listener = function(){
    var map;
    var $layer;
    var added_feature;
    var deleted_feature;

    //  Select the drawing layer
    map = TETHYS_MAP_VIEW.getMap();
    for (i=0;i < map.getLayers().getArray().length;i++){
        if (map.getLayers().item(i).tethys_legend_title === "Drawing Layer"){
            $layer = map.getLayers().item(i);
        }
    };

    //  These are the function to be called by the listener
    added_feature = function(e){
        var feature;
        var layerName;
        var id

        try{
            layerName = e.target.tag;
            //  This id is unique to the editing layer, as you draw with the editing layer it will increment
            //  an "id_" variable for each feature. the $id is used as a selector to ensure that the right
            //  feature is grabbed for putting information together for the table.
            $id = $id + 1;
            //  Sets a new id for the object and is unique to the object within the layer being edited.
            //  If there are no objects in the edit layer then the id will be set to 1. If there are existing
            //  features then the id will be +1 of whatever the previous object's id was.
            if (e.target.getSource().getFeatures().length === 1){
                id = 1;
            }
            else {
                for (i=0;i < e.target.getSource().getFeatures().length; i++){
                    if (e.target.getSource().getFeatures()[i].getProperties()["ID"] === undefined){}
                    else if (e.target.getSource().getFeatures()[i].getProperties()["ID"] < id){}
                    else{
                        id = e.target.getSource().getFeatures()[i].getProperties()["ID"];
                    }
                };
                id = id + 1;
            }
            feature = e.target.getSource().getFeatureById($id);

            if (feature === null){
                $layer.once('change',added_feature);
                $id = $id - 1;
                return;
            }

            //  Use if/else statments to specify which attributes to add to the feature
            if (layerName === 'Constant and Model'){
                for (i=0;i<model_constant_layer.length;i++){
                    feature.set(model_constant_layer[i],"");
                }
                var label = "Constant_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Wells'){
                for (i=0;i<wells_layer.length;i++){
                    feature.set(wells_layer[i],"");
                };
                var label = "Well_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Line Sinks'){
                for (i=0;i<line_sink_layer.length;i++){
                    feature.set(line_sink_layer[i],"");
                };
                var label = "LineSink_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Head Line Sinks'){
                for (i=0;i<head_line_sink_layer.length;i++){
                    feature.set(head_line_sink_layer[i],"");
                };
                var label = "HeadLineSink_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Res Line Sinks'){
                for (i=0;i<res_line_sink_layer.length;i++){
                    feature.set(res_line_sink_layer[i],"");
                };
                var label = "ResLineSink_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Line Doublet Imp'){
                for (i=0;i<line_doublet_imp_layer.length;i++){
                    feature.set(line_doublet_imp_layer[i],"");
                };
                var label = "LineDoubletImp_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Line Sink Ditch'){
                for (i=0;i<line_sink_ditch_layer.length;i++){
                    feature.set(line_sink_ditch_layer[i],"");
                };
                var label = "LineSinkDitch_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
            else if (layerName === 'Polygon Inhom'){
                for (i=0;i<polygon_inhom_layer.length;i++){
                    feature.set(polygon_inhom_layer[i],"");
                };
                var label = "PolygonInhom_" + id;
                feature.set("Label",label);
                feature.set("ID",id);
            }
//            console.log(feature);

            $layer.once('change',added_feature);

            addRow(layerName,feature,id);
        }
        catch(err){}
    };
    deleted_feature = function(e){
        var id=0;
        var counter;
        var features;
        var layerName;
        var map;
        var layer;

        //  Find the ID of the feature that was deleted and pass the number to the deleteRow
        for (i=0;i<e.target.getSource().getFeatures().length;i++){
            counter = e.target.getSource().getFeatures()[i].getProperties()["ID"] - id;
            if (counter === 1){
                id = e.target.getSource().getFeatures()[i].getProperties()["ID"];
                //  Check if the feature was the last feature on the layer, add one to the id if true
                if (id === e.target.getSource().getFeatures().length){
                    id += 1;
                }
            }
            //  If the id is greater than the length of the feature array, then it is the first object
            else if(id > e.target.getSource().getFeatures().length){
                id = 1;
                { break; }
            }
            else{
                id += 1;
                { break; }
            }
        };
        if (id === 0){
            layerName = e.target.tag;
            map = TETHYS_MAP_VIEW.getMap();
            for (i=0;i<map.getLayers().getArray().length;i++){
                if (map.getLayers().item(i).tethys_legend_title === layerName){
                    if (map.getLayers().item(i).getSource().getFeatures().length > 0){
                        console.log("The save button has been pushed");
                        return;
                    }
                    else{}
                }
                else{}
            };
        }
        if (id === 0){
            id = 1;
        }
        features = e.target.getSource().getFeatures();
        deleteRow(id,features);
        $layer.once('change',deleted_feature);
    };

    //  Add Listeners only to the drawing layer while draw/delete tools are active/in-use
    $('#draw_Point').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
        $layer.once('change',added_feature);
    });
    $('#draw_Box').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
        $layer.once('change',added_feature);
    });
    $('#draw_Polygon').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
        $layer.once('change',added_feature);
    });
    $('#draw_LineString').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
        $layer.once('change',added_feature);
    });

    //  Remove Listeners if any other map tool is in use
    $('#tethys_pan').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
    });
    $('#tethys_modify').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
    });
    $('#tethys_delete').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
        $layer.once('change',deleted_feature);
    });
    $('#tethys_move').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
    });

    //  Remove Listeners altogether when saving or canceling
    $('#editSave').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
    });
    $('#editCancel').click(function(){
        $layer.un('change',added_feature);
        $layer.un('change',deleted_feature);
    });
};

save_attributes = function(layerName){
    var map;
    var layer;
    var features;
    var feature;
    var selector;
    var copyFeatures = [];
    var featureProps = [];
    var id = 0;
    var jsonFeatures;

    //  Get the correct layer which the attributes need to be saved to
    map = TETHYS_MAP_VIEW.getMap();
    for(i=0;i<map.getLayers().getArray().length;i++){
        if (map.getLayers().item(i).tethys_legend_title === layerName){
            layer = map.getLayers().item(i);
        }
    };

    //  Loop through each feature and property and set the value of the field to the feature
    features = layer.getSource().getFeatures();
    //  Make sure that the features are in the right order so that the ID's match the table field
    features.sort(function(a,b){
	    return a.getProperties()["ID"] - b.getProperties()["ID"];
    });
    for (i=0;i<features.length;i++){
        feature = features[i];
        for (property in feature.getProperties()){
            if (String(property) === 'geometry'){}
            else if (String(property) === 'ID'){}
            else if (String(property) === 'type'){}
            else{
                //  id number represents the row number in this case
                id = feature.getProperties()["ID"];
                selector = property.replace(/\s+/g,'_') + "_" + id;
                feature.set(String(property),$('#'+selector)["0"].value);
            }
        };
    };

    //  Update features to have the right attributes
    for (feature in layer.getSource().getFeatures()){
        copyFeatures.push({
            'type': 'Feature',
            'geometry':{
                'type': layer.getSource().getFeatures()[feature].getGeometry().getType(),
                'coordinates': layer.getSource().getFeatures()[feature].getGeometry().getCoordinates(),
            }
        });
        //  Gather the properties for each element
        featureProps[feature] = [];
        for (property in layer.getSource().getFeatures()[feature].getProperties()){
            if (String(property) === 'geometry'){}
            else if (String(property) === 'type'){}
            else{
                featureProps[feature].push([String(property),layer.getSource().getFeatures()[feature].getProperties()[property]])
            }
        };
    };
    //  Add Properties to feature list
    for (feature in copyFeatures){
        for (prop in featureProps[feature]){
            copyFeatures[feature][featureProps[feature][prop][0]] = featureProps[feature][prop][1];
        };
    };
    //  Read features and color to string for sessionStorage and then store features and style
    jsonFeatures = JSON.stringify(copyFeatures);
    sessionStorage.setItem(String(layerName + "_Features"),jsonFeatures);

    return copyFeatures
};

//  Build the attribute table (called by table_of_contents.js)
build_table = function(layerName,features,editable){
    var table;
    var row;
    var cell;
    var feature;
    var id;
    var featureCount;

    //  Save the attributes before anything else if the table has been edited and needs to be saved
    if ($('#attr-table.edit')[0] != undefined){
        features = save_attributes(layerName);
        $('#attr-table').removeClass('edit')
    }
    //  Empty out the attribute table before rebuilding
    $('#attr-table tbody').empty();

    //  Features will be reorganized by their ID attribute to preserve the original drawing order
    features.sort(function(a,b){
	    return a["ID"] - b["ID"];
    });

    //  Build Table from features and properties
    table = document.getElementById('attr-table');
    row = table.insertRow(-1)
    for (property in features[0]){
        if (String(property) === 'geometry'){}
        else if (String(property) === 'type'){}
        else if (String(property) === 'ID'){}
        else{
            cell = row.insertCell();
            cell.style = "width:auto";
            cell.innerHTML = String(property);
        }
    };

    if (editable){
        $('#attr-table').addClass('edit')
        for (i=0;i<features.length;i++){
            feature = features[i];
            row = table.insertRow(-1);
            id = feature["ID"];
            for (property in feature){
                if (String(property) === 'geometry'){}
                else if (String(property) === 'type'){}
                else if (String(property) === 'ID'){}
                else{
                    cell = row.insertCell();
                    cell.style = "width:auto";
                    cell.innerHTML = "<input id=" + property.replace(/\s+/g,'_') + "_" + id +" type='text'" +
                        "class='form-control input-sm' value=' '" +
                        "style=width:auto;margin-bottom:0;" + ">";
                    $(cell).find("input")["0"].value = String(feature[property]);
                }
            };
        };
    }

    else{
        for (i=0;i<features.length;i++){
            feature = features[i];
            row = table.insertRow(-1);
            for (property in feature){
                if (String(property) === 'geometry'){}
                else if (String(property) === 'type'){}
                else if (String(property) === 'ID'){}
                else{
                    cell = row.insertCell();
                    cell.style = "width:auto";
                    cell.innerHTML = feature[property];
                }
            };
        };
    }

    //  Update the feature count for each layer
    featureCount = features.length;
    $('.layer-name').each(function(index){
        if($(this).text().trim()===layerName){
            $(this).parent().find('.feature-count').html("(" + featureCount + ")");}
    })
};

addRow = function(layerName,feature,id){
    var table;
    var row;
    var cell;

    //  Designates that the table is open for editing and that changes should be saved
    $('#attr-table').addClass('edit')

    if ($('#attr-table tbody').text() === "No Features on Selected Layer"){
        //  Clear out the table and initialize table and row variables
        $('#attr-table tbody').empty();
        table = document.getElementById('attr-table');
        row = table.insertRow(0)
            for (property in feature.getProperties()){
                if (String(property) === 'geometry'){}
                else if (String(property) === 'ID'){}
                else if (String(property) === 'type'){}
                else{
                    cell = row.insertCell();
                    cell.style = "width:auto";
                    cell.innerHTML = String(property);
                }
            };
    }
    table = document.getElementById('attr-table');
    row = table.insertRow(-1);
        for (property in feature.getProperties()){
            if (String(property) === 'geometry'){}
            else if (String(property) === 'ID'){}
            else if (String(property) === 'type'){}
            else{
                cell = row.insertCell();
                cell.style = "width:auto";
                //  Credits to @Deviljho and @SimeVidas on stackoverflow.com for this little trick with removing spaces
                cell.innerHTML = "<input id=" + property.replace(/\s+/g,'_') + "_" + id +" type='text'" +
                    "class='form-control input-sm' value=' '" +
                    "style=width:auto;margin-bottom:0;" + ">";
                $(cell).find("input")["0"].value = String(feature.getProperties()[property]);
            }
        };
};

deleteRow = function(id,features){
    var counter;
    var oldID;
    var selector;
    var new_input_id;

    //  Delete the appropriate row in the table
    if ($('#attr-table tbody').find('tr')[id] != undefined){
        $('#attr-table tbody').find('tr')[id].remove();
    }
    else{
        return;
    }


    //  Renumber the id's of the features
    for (i=0;i<features.length;i++){
        if (features[i].getProperties()["ID"] < id){}
        else if ((features[i].getProperties()["ID"] - id)===1){
            oldID = features[i].getProperties()["ID"];
            features[i].set("ID",Number(id));
            counter = 1;
            //  Reassign the table input id's per input to match the new feature id
            for (property in features[i].getProperties()){
                if (property === 'geometry'){}
                else if (property === 'type'){}
                else{
                    selector = property.replace(/\s+/g,'_') + "_" + oldID;
                    new_input_id = property.replace(/\s+/g,'_')+ "_" + id;
                    $('#'+selector).prop('id',new_input_id);
                }
            };
        }
        else{
            oldID = features[i].getProperties()["ID"];
            features[i].set("ID",Number(id+counter));
            //  Reassign the table input id's per input to match the new feature id
            for (property in features[i].getProperties()){
                if (property === 'geometry'){}
                else if (property === 'type'){}
                selector = property.replace(/\s+/g,'_') + "_" + oldID;
                new_input_id = property.replace(/\s+/g,'_')+ "_" + Number(id+counter);
                $('#'+selector).prop('id',new_input_id);
            };
            counter += 1;
        }
    };
};

/*****************************************************************************
 *                            TimML Layers
 *****************************************************************************/
initialize_timml_layers = function(){
    var map = TETHYS_MAP_VIEW.getMap();
    var timml_layer;
    var numLayers;
    var layers = [];
    var color;
    var featureCollection;

    //  Initialize the headers for each layer
    model_constant_layer = ["Label","constant head","constant layer","uflow grad","uflow angle",
        "k","zb","zt","c","n","nll"];
    wells_layer = ["Label","Qw","rw","layers"];
    line_sink_layer = ["Label","sigma","layers"];
    head_line_sink_layer = ["Label","head","layers"];
    res_line_sink_layer = ["Label","head","res","width","layers","bottomelev"];
    line_doublet_imp_layer = ["Label","order","layers"];
    line_sink_ditch_layer = ["Label","Q","res","width","layers"];
    polygon_inhom_layer = ["Label","Naquifers","k","zb","zt","c","n","nll","inhom side order"];


    //  Assign layers[] with the list of TimML layer variables with [layer,color]
    layers.push(['Polygon Inhom','rgba(10,10,10,0.5)']);
    layers.push(['Line Sink Ditch','#8B4513']);
    layers.push(['Line Doublet Imp','#000000']);
    layers.push(['Res Line Sinks','#008000']);
    layers.push(['Head Line Sinks','#ADD8E6']);
    layers.push(['Line Sinks','#0000ff']);
    layers.push(['Wells','#fff000']);
    layers.push(['Constant and Model','#ff0000']);

    for (i=0;i<layers.length;i++){
        layer = layers[i];

        //  Verify that the session doesn't already have features. Use Session memory first if available.
        //  Otherwise, if no session memory exists for the layer, build new from scratch.
        if (sessionStorage[String(layer[0]+"_Features")] != undefined){
            jsonFeatures = sessionStorage[String(layer[0] + "_Features")];
            oldFeatures = JSON.parse(jsonFeatures);

            //  Read features into a feature collection object
            featureCollection = {
                'type': 'FeatureCollection',
                'crs': {
                    'type': 'name',
                    'properties': {
                        'name':'EPSG:4326'
                    }
                },
                'features': oldFeatures
            };

            //  Establish the format as GeoJSON
            format = new ol.format.GeoJSON();

            layer_source = new ol.source.Vector({
                features: format.readFeatures(featureCollection,
                {featureProjection:"EPSG:4326"})
            });
            //  Because Openlayers 3 doesn't preserve custom property tags we need to reset
            //  the properties as they were stored.
            for (feature in layer_source.getFeatures()){
                for (prop in oldFeatures[feature]){
                    if (prop === "geometry"){}
                    else{
                        layer_source.getFeatures()[feature].set(String(prop),
                        oldFeatures[feature][prop])
                    }
                };
            };
        }
        else{
            layer_source = new ol.source.Vector({wrapX: false});
        }

        if (sessionStorage[String(layer[0]+"_Style")] != undefined){
            color = JSON.parse(sessionStorage[String(layer[0]+"_Style")]);
        }
        else{
        color = layer[1];
        }

        timml_layer = new ol.layer.Vector({
            source: layer_source,
            style: new ol.style.Style({
                    fill: new ol.style.Fill({
                    color: color
                    }),
                    stroke: new ol.style.Stroke({
                    color: color,
                    width: 2
                    }),
                    image: new ol.style.Circle({
                        radius: 4,
                        fill: new ol.style.Fill({
                          color: color
                        })
                    }),
                })
        });

        // Add drawing layer legend properites
        timml_layer.tethys_legend_title = String(layer[0]);
        timml_layer.tethys_editable = true;
        timml_layer.tethys_data = {'tethys_toc':true};
        timml_layer.color = color;

        // Add drawing layer to the map
        map.addLayer(timml_layer);
    }

    //  Assign Geometry type to layers, used to initialize the right state of edit mode later on
    map.getLayers().item(2).setProperties({'geometry_attribute': 'polygon'});
    map.getLayers().item(3).setProperties({'geometry_attribute': 'line'});
    map.getLayers().item(4).setProperties({'geometry_attribute': 'line'});
    map.getLayers().item(5).setProperties({'geometry_attribute': 'line'});
    map.getLayers().item(6).setProperties({'geometry_attribute': 'line'});
    map.getLayers().item(7).setProperties({'geometry_attribute': 'line'});
    map.getLayers().item(8).setProperties({'geometry_attribute': 'point'});
    map.getLayers().item(9).setProperties({'geometry_attribute': 'point'});


};
/*****************************************************************************
 *                       Add Select Interactions to Map
 *****************************************************************************/
//$(document).ready(function(){
//    var map = TETHYS_MAP_VIEW.getMap();
//    //  Credits for the map "select" interactions to Drag Box Selection Openlayers 3 Example
//    //  http://openlayers.org/en/latest/examples/box-selection.html?q=select
//    // a normal select interaction to handle click
//    var select = new ol.interaction.Select();
//    map.addInteraction(select);
//
//    var selectedFeatures = select.getFeatures();
//
//    // a DragBox interaction used to select features by drawing boxes
//    var dragBox = new ol.interaction.DragBox({
//    condition: ol.events.condition.platformModifierKeyOnly
//    });
//
//    map.addInteraction(dragBox);
//
//    var infoBox = document.getElementById('info');
//
//    dragBox.on('boxend', function() {
//    // features that intersect the box are added to the collection of
//    // selected features, and their names are displayed in the "info"
//    // div
//    var info = [];
//    var extent = dragBox.getGeometry().getExtent();
//    vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
//      selectedFeatures.push(feature);
//      info.push(feature.get('name'));
//    });
//    if (info.length > 0) {
//      infoBox.innerHTML = info.join(', ');
//    }
//    });
//
//    // clear selection when drawing a new box and when clicking on the map
//    dragBox.on('boxstart', function() {
//    selectedFeatures.clear();
//    infoBox.innerHTML = '&nbsp;';
//    });
//    map.on('click', function() {
//    selectedFeatures.clear();
//    infoBox.innerHTML = '&nbsp;';
//    });
//});

/*****************************************************************************
 *                        To be executed on load
 *****************************************************************************/

$(document).ready(function(){
    var map = TETHYS_MAP_VIEW.getMap();
    //  This will hide the drawing layer from the table of contents and add the basemap to the table of contents
    map.getLayers().item(0).tethys_data={'tethys_toc':true};
    map.getLayers().item(1).tethys_data={'tethys_toc':false};
    //  Initialize the TimML layers to be used
    initialize_timml_layers();
    //  Bind listeners to map drawing tools
    drawing_listener();
    //  Hide the loading gif
    $('#loading').addClass("hidden");
});

/*****************************************************************************
 *                              Public
 *****************************************************************************/

 var app;

 app = {build_table:build_table,
        drawing_listener:drawing_listener,
        save_attributes:save_attributes}

///*****************************************************************************
// *                          Useful snippets of code
// *****************************************************************************
// layer.getSource().getExtent(),
// this will return the extents of a layer, returns the coordinates of the bottom right corner and the top left corner
//
//  // Copy original feature
//  var clone = map.getLayers().item(i).features[0].clone();
//  // Get the ID of a feature in openlayers
//  layers.item(i).getSource().getFeatures()[j].getId();
//  // Set the feature ID
//  layers.item(i).getSource().getFeature()[j].setId();
//  // Get the Feature by its ID
//  layers.item(i).getSource().getFeatureById(j);
//  // Remove a layers attribute
//  delete map.getLayers().item(1)['tag']
//
// /

//  Need to build the table using jquery
//  Bootstrap classes: table, table-hover, table-striped
//  AddRows
//  $('#myTable tbody').append("<tr> <td style="width:auto;">Bill</td> <td><input id="ageInput21" name="ageInput21" type="text" class="form-control input-sm" value="30" style = width: auto;margin-bottom:0;"</td><td>cell3</td></tr>")
//  Also need to attach jquery listeners so that every new object drawn triggers a new row with the same columns
//  as generated for the layer.
//  Persists and loads will be done through JSON to and from the map MVLayers
