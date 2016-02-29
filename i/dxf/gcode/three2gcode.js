var generateGcodeTimeoutPtr = null;
var isGcodeInRegeneratingState = false;
var options = {};


function generateGcode() {
   // this may be an odd place to trigger gcode change, but this method
   // is called on all scaling changes, so do it here for now
   if (generateGcodeTimeoutPtr) {
       //console.log("clearing last setTimeout for generating gcode cuz don't need anymore");
       clearTimeout(generateGcodeTimeoutPtr);
   }
   if (!isGcodeInRegeneratingState) {
        //  $('#' + this.id + " .gcode").prop('disabled', true);
        //  $('#' + this.id + " .btn-sendgcodetows").prop('disabled', true);
        //
        //  $('#' + this.id + " .regenerate").removeClass('hidden');
        //  $('#' + this.id + " .gcode-size-span").addClass('hidden');
        //  set this to true so next time we are called fast we know we don't have
       // to set the UI elements again. they'll get set back and this flag after
       // the gcode is generated
       isGcodeInRegeneratingState = true;

   } else {
       // do nothing
       //console.log("already indicated in UI we have to regenerate");
   }
   generateGcodeTimeoutPtr = setTimeout(generateGcodeCallback.bind(this), 1000);
};


function getSettings() {
   // get text
  //  this.options["svg"] = $('#input-svg').val();
  //  this.options["pointsperpath"] = parseInt($('#input-pointsperpath').val());
  //  this.options["holes"] = $('#input-holes').is(":checked");
  //  this.options["cut"] = $('#' + this.id + ' input[name=com-chilipeppr-widget-svg2gcode-cut]:checked').val();
  //  this.options["dashPercent"] = $('#input-dashPercent').val();
  //  this.options["mode"] = $('#' + this.id + ' input[name=com-chilipeppr-widget-svg2gcode-mode]:checked').val();
  //  this.options["laseron"] = $('#' + this.id + ' input[name=com-chilipeppr-widget-svg2gcode-laseron]:checked').val();
  //  this.options["lasersvalue"] = $('#input-svalue').val();
  //  this.options["millclearanceheight"] = parseFloat($('#input-clearance').val());
  //  this.options["milldepthcut"] = parseFloat($('#input-depthcut').val());
  //  this.options["millfeedrateplunge"] = $('#input-feedrateplunge').val();
  //  this.options["feedrate"] = $('#input-feedrate').val();

   //this.options["svg"] = '';
   options["pointsperpath"] = 1;
   options["holes"] = 0;
   options["cut"] = 'solid';
   options["dashPercent"] = 20;
   options["mode"] = 'laser';
   options["laseron"] = 'M3';
   options["lasersvalue"] = '255';
   options["millclearanceheight"] = 5.00;
   options["milldepthcut"] = 3.00;
   options["millfeedrateplunge"] = 200.00;
   options["feedrate"] = 300.00;


  //  /console.log("settings:", options);



   //this.saveOptionsLocalStorage();
};


/**
* Iterate over the text3d that was generated and create
* Gcode to mill/cut the three.js object.
*/
function generateGcodeCallback() {

   // get settings
   getSettings();

   var g = "(Gcode generated by ChiliPeppr / Laserweb Dxf2Gcode Widget)\n";
   //g += "(Text: " + this.mySceneGroup.userData.text  + ")\n";
   g += "G21 (mm)\n";

   // get the THREE.Group() that is the txt3d
   var grp = dxfObject;
   var txtGrp = dxfObject;

   var that = this;
   var isLaserOn = false;
   var isAtClearanceHeight = false;
   var isFeedrateSpecifiedAlready = false;
   txtGrp.traverse( function(child) {
       if (child.type == "Line") {
           // let's create gcode for all points in line
           for (i = 0; i < child.geometry.vertices.length; i++) {
               console.log(child.geometry.vertices[i]);
               var localPt = child.geometry.vertices[i];
               var worldPt = grp.localToWorld(localPt.clone());
               if (i == 0) {
                   // first point in line where we start lasering/milling
                   // move to point

                   // if milling, we need to move to clearance height
                   if (options.mode == "mill") {
                       if (!isAtClearanceHeight) {
                           g += "G0 Z" + options.millclearanceheight + "\n";
                       }
                   }

                   // move to start point
                   g += "G0 X" + worldPt.x.toFixed(3) +
                       " Y" + worldPt.y.toFixed(3) + "\n";

                   // if milling move back to depth cut
                   if (options.mode == "mill") {
                       var halfDistance = (options.millclearanceheight - options.milldepthcut) / 2;
                       g += "G0 Z" + (options.millclearanceheight - halfDistance).toFixed(3)
                           + "\n";
                       g += "G1 F" + options.millfeedrateplunge +
                           " Z" + options.milldepthcut + "\n";
                       isAtClearanceHeight = false;
                   }

               }
               else {

                   // we are in a non-first line so this is normal moving

                   // see if laser or milling
                   if (options.mode == "laser") {

                       // if the laser is not on, we need to turn it on
                       if (!isLaserOn) {
                           if (options.laseron == "M3") {
                               g += "M3 S" + options.lasersvalue;
                           } else {
                               g += options.laseron;
                           }
                           g += " (laser on)\n";
                           isLaserOn = true;
                       }
                   } else {
                       // this is milling. if we are not at depth cut
                       // we need to get there


                   }

                   // do normal feedrate move
                   var feedrate;
                   if (isFeedrateSpecifiedAlready) {
                       feedrate = "";
                   } else {
                       feedrate = " F" + options.feedrate;
                       isFeedrateSpecifiedAlready = true;
                   }
                   //console.log('World', worldPt);
                   //console.log('Local', localPt);
                   g += "G1" + feedrate;
                   g += " X" + worldPt.x.toFixed(3);
                   g += " Y" + worldPt.y.toFixed(3);
                   g += " S255\n";

               }
           }

           // make feedrate have to get specified again on next line
           // if there is one
           isFeedrateSpecifiedAlready = false;

           // see if laser or milling
           if (options.mode == "laser") {
               // turn off laser at end of line
               isLaserOn = false;
               if (options.laseron == "M3")
                   g += "M5 (laser off)\n";
               else
                   g += "M9 (laser off)\n";
           } else {
               // milling. move back to clearance height
               g += "G0 Z" + options.millclearanceheight + "\n";
               isAtClearanceHeight = true;
           }
       }
   });

   console.log("generated gcode. length:", g.length);
   console.log("gcode:", g);
  //  $('#' + this.id + " .gcode").val(g).prop('disabled', false);
  //  $('#' + this.id + " .btn-sendgcodetows").prop('disabled', false);
  //  $('#' + this.id + " .regenerate").addClass('hidden');
  //  $('#' + this.id + " .gcode-size-span").removeClass('hidden');
  //  $('#' + this.id + " .gcode-size").text(parseInt(g.length / 1024) + "KB");
   //
  isGcodeInRegeneratingState = false;

  // Remove DXF Preview
  if (typeof(dxfObject) !== 'undefined') {
    scene.remove(dxfObject);
  };

  // Send to LaserWeb
  document.getElementById("gcodepreview").value = g;
  openGCodeFromText();
	gCodeToSend = g
	$('#sendToLaser').removeClass('disabled');
	document.getElementById('fileInputGcode').value = '';
	document.getElementById('fileInputDXF').value = '';
	document.getElementById('fileInputSVG').value = '';
	//document.getElementById('fileInputMILL').value = '';
	$('#console').append('<p class="pf" style="color: #000000;"><b>NewDXFLib Complete...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

};
