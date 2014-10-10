// A global variable for the WebGL context
var gl;

var shaderProgram;

// Setup the 'model-view' matrix using 'glMatrix' library. - Used to represent the current move/rotate state of the 3D-space. 
var mvMatrix = mat4.create();

var pMatrix = mat4.create();

// Stack data structure used to hold the correct "current" state of the 'model-view' matrix. (Used by 'drawScene()' function)
var mvMatrixStack = [];

var triangleVertexPositionBuffer;
var triangleVertexColorBuffer;

var squareVertexPositionBuffer;
var squareVertexColorBuffer;

// Variables used to track the rotation of the whole scene, triangle and square.
var rScene= 0;
var rTri = 0;
var rSquare = 0;

// Keeps track of the last time since the 'animate()' function was called. 
var lastTime = 0;

/* Updates the rotation angle by a number of degrees based on the duration since the last time the function was called. 
 *
 * This ensures that no matter how fast/slow the computer is, the shapes will always rotate at the same rate. 
 */
function animate() {
    var timeNow = new Date().getTime();
    
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;
            
            // The scene is set to rotate at a rate of 90 degrees per second. 
            rScene += (90 * elapsed) / 1000.0;
            
            // The triangle is set to rotate at a rate of 270 degrees per second. 
            rTri += (270 * elapsed) / 1000.0;
            
            // The square is set to rotate at a rate of 360 degrees per second. 
            rSquare += (360 * elapsed) / 1000.0;
        }
    
    lastTime = timeNow;
}

/* Pushes the current "version/state" of the 'model-view' matrix ('mvMatrix') to the stack to store it's state. */
function mvPushMatrix() {
    var copy = mat4.create();
    //mat4.set(mvMatrix, copy);
    
    mat4.copy(copy, mvMatrix);
    mvMatrixStack.push(copy);
}

/* Restores the currently stored version of the 'model-view' matrix ('mvMatrix') from the stack. */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "No 'model-view' matrix to pop!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/* Utility function to convert degrees to radians (required by the 'mat4.rotate()' function) */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/* Setup and initialise WebGL (bind to HTML5 canvas) */
function initGL(canvas) {

	// Only continue if WebGL is available and working.
    try {
    
        //canvas.width = document.width/2;
        //canvas.height = document.height/2;
        
        // Try to grab the standard context. If it fails, fallback to experimental.
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        
        //Set the viewport width/height for WebGL to use later. 
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        
    } catch (e) {
	    
	    console.log(e);
    }
    
    if (!gl) {
        alert("Could not initialise WebGL.");
    }
}

/* Extracts the WebGL shader code from the DOM. */
function getShader(gl, id) {

    var shaderScript = document.getElementById(id);
    
    if (!shaderScript) {
        return null;
    }
	
	// Load the actual shader code into the 'str' variable. 
    var str = "";
    
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    
    // Check the MIME type to determine if its a vertex or fragment shader, before creating the appropiate shader type.
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
    
	// Load in the shader source taken from the DOM. 
    gl.shaderSource(shader, str);
    
    // Compile the shader program
    gl.compileShader(shader);

	// See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));  
        return null;
    }

    return shader;
}

/* Set-up and create the vertex and fragment shaders. */
function initShaders() {

	// Loaded from <script> element with ID "shader-fs"
    var fragmentShader = getShader(gl, "shader-fs");
    
    // Loaded from <script> element with ID "shader-fs"
    var vertexShader = getShader(gl, "shader-vs");
	
	// Create the shader program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    /* Get the reference to the 'aVertexPosition' attribute that we want to pass to the vertex shader for each vertex. */
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    /* Get the reference to the 'aVertexColor' attribute that we want to pass to the vertex shader for each vertex. */
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

/* Instructs WebGL to process the changes made the 'model-view' matrix and 'projection' matrix (by 'glMatrix' library) on the graphics card. */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/* Creates WebGL buffers that contain object vertices. */
function initBuffers() {
    
    // -- SET TRIANGLE VERTICES POSITION --
    
	// Create a WebGL buffer to store triangle vertex values. 
    triangleVertexPositionBuffer = gl.createBuffer();
    
    // Bind this new buffer to the current WebGL context.
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    
    // Vertices for the three corners of the triangle.
    var vertices = [
        0.0, 1.0, 0.0, 
		-1.0, -1.0, 0.0,
        1.0, -1.0, 0.0
    ];
    
    // Pass the vertices defined above in the JS over to WebGL. 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    // These say that this 9-element buffer actually represents three separate vertex positions (numItems), each of which is made up of three numbers (itemSize).
    triangleVertexPositionBuffer.itemSize = 3;
    triangleVertexPositionBuffer.numItems = 3;
    
    
    // -- SET TRIANGLE VERTICES COLOURS --
    
    triangleVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
    
    //Define the colours for all three vertices.
    var colors = [
        1.0, 0.0, 0.0, 1.0, //Red
        0.0, 1.0, 0.0, 1.0, //Green
        0.0, 0.0, 1.0, 1.0  //Blue
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    triangleVertexColorBuffer.itemSize = 4;
    triangleVertexColorBuffer.numItems = 3;
    
    // -- SET SQUARE VERTICES POSITION --

	// Create a WebGL buffer to store triangle vertex values. 
    squareVertexPositionBuffer = gl.createBuffer();
    
    // Bind this new buffer to the current WebGL context.
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    
    // Vertices for the four corners of the square.
    vertices = [
        1.0, 1.0, 0.0, 
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0, 
        -1.0, -1.0, 0.0
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    squareVertexPositionBuffer.itemSize = 3;
    squareVertexPositionBuffer.numItems = 4;
    
    // -- SET SQUARE VERTICES COLOURS --
    
    squareVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
    
    colors = []
    
    // As we are going to use the SAME COLOUR for ALL FOUR VERTICES, we can use a loop to create the JS array.
     for (var i=0; i < 4; i++) {
      colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
    }
    
    // Or.. if we wanted to we could define our own colours for all four vertices again, up to you. 
    /* colors = [
        0.5, 0.5, 1.0, 1.0,
        0.0, 0.8, 0.2, 1.0, 
        0.5, 0.5, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0 
    ] */
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    squareVertexColorBuffer.itemSize = 4;
    squareVertexColorBuffer.numItems = 4;
}

/* 
 * Fundamentally, when it comes to drawing the scene (and it's objects) we need to draw everything in REVERSE. 
 *
 * This means that we draw the shapes FIRST (translating and rotating as required) before "moving up" to the "scene level"
 * (before translating and rotating the scene as required)
 *
 * BETTER DESCRIPTION: WE CAN "GROUP" TRANSFORMATIONS INTO "PARENT/CHILD" GROUPS WHEREBY THE "CHILD" OBJECTS CAN BE AFFECTED BY THE 
 * TRANSFORMATIONS OF THEIR "PARENT" OBJECTS AS WELL AS THEIR OWN SPECIFIC-TRANSLATIONS. 
 *
 * E.G. SHAPES CAN BE SET TO SPIN AROUND IN A ORBIT (SPINNING SET ON "PARENT" SCENE) AND CAN THEN ALSO SPIN ON THEIR OWN AXIS AT THE SAME 
 * TIME!
 */
function drawScene() {
	
 	var translation = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
     
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

	// "Move" WebGL to the centre of the 3D-space.
    mat4.identity(mvMatrix);
    
    // NEW: Next move the TOP-LEVEL SCENE back along the 'Z' axis by -7 units. 
    vec3.set(translation, 0.0, 0.0, -7.0);
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    // NEW: Save the state of the TOP-LEVEL SCENE.
    mvPushMatrix();
    
    // NEW: Rotate the TOP-LEVEL model-view along the 'Y' axis (A.K.A. the SCENE - makes both shapes orbit around each other).
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rScene), [0, 1, 0]);
    
    /* 
     * LOOK HERE! WE ARE PUSHING THE MODEL-VIEW MATRIX AGAIN BEFORE POPPING!
     * 
     * NEW: Now we are going to make a copy of the MV matrix as it is at this point it time (with the scene rotation applied).
     *
     * We will use this as a "base" for the next set of transformations on the shapes so that they will also rotate with the scene AS WELL
     * AS any ADDITIONAL rotations/transformations that we apply to the shapes individually. 
     *
     * We are doing this because we want the spinning of the TOP-LEVEL SCENE to AFFECT the OBJECTS WITHIN IT (square and triangle).
     */
    mvPushMatrix();
    
    // -- DRAW THE TRIANGLE --
    
    /* 
     * NEW: Now we can move -1.5 to the left (to draw the triangle) 
     *
     * We don't need to move backwards as we have already done this (above) for the top-level scene. 
     */ 
    vec3.set(translation, -1.5, 0.0, 0.0);
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    // NEW: Rotate the TRIANGLE along it's 'Y' axis (this does not affect the SCENE, but the spinning scene WILL STILL AFFECT THE TRIANGLE)
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rTri), [0, 1, 0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    setMatrixUniforms();
    
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);
    
    /* 
     * NEW: Now we want to 'pop' the current 'model-view' matrix (applying SCENE AND TRIANGLE) transformations as we don't want to
     * to apply the TRIANGLE transformations of the SQUARE that we are about to draw. 
     *
     * 'Popping' this MV matrix will "re-load" the TOP-LEVEL scene MV matrix 'pushed' earlier (above) meaning that the rotation applied 
     * on the TOP-LEVEL scene will still apply on the SQUARE we are about the draw. 
     *
     * If we wanted to keep the square in a static place (i.e. we didn't want it to rotate with the top-level scene) we could also 
     * 'pop' the TOP-LEVEL SCENE model-view matrix as well. (e.g. "mvPopMatrix(); mvPopMatrix();")
     */
    mvPopMatrix();
     
    // -- DRAW THE SQUARE --
    
    /* NEW: Now we want to (again) push another model-view matrix for the SQUARE (same as we did for the triangle).
     *
     * This is so that we don't affect anything else with the rotation/translations perform on the square itself. 
     */
    mvPushMatrix();
    
    /*
     * NEW: Now we move the square over by 1.5 units to the right (as we are still in the horizontal centre of the 3D-scene) from the
     * TOP-LEVEL SCENE matrix.
     */
    vec3.set(translation, 1.5, 0.0, 0.0);
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    // NEW: Rotate the SQUARE along it's 'X' axis (this does not affect the SCENE or the TRIANGLE, but the spinning scene WILL STILL AFFECT THE SQUARE)
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rSquare), [1, 0, 0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
    
    // NEW: We can now 'pop' the square-specific 'model-view' matrix as we do not want to do anything else with the square. 
    mvPopMatrix();
    
    
        /* NEW: DRAW ANYTHING ELSE THAT SHOULD BE AFFECTED BY THE SPINNING TOP-LEVEL SCENE HERE!! */ 
    
    /* 
     * NEW: Finally, we can 'pop' the 'model-view' matrix of the TOP-LEVEL scene as we do not want anything else to be affected by the spinning scene. 
     *
     */
    mvPopMatrix();
    
        /* 
         * NEW: ANYTHING AFTER THIS POINT WOULD NOT ORBIT AROUND AS WE HAVE LEFT THE "CONTEXT" OF THE TOP-LEVEL SCENE. 
         * 
         * WE NOW HAVE NOTHING LEFT ON THE 'MODEL-VIEW' MATRIX STACK.
         */
    
}

function tick() {
    
    /* Calls function in 'webgl-utils.js' library to provide browser-independent method of calling us back when it wants to repaint the WebGL scene — for example, next time the computer’s display is refreshing itself. */
    requestAnimFrame(tick);
    
    // Draw the current objects to the WebGL context. 
    drawScene();
    
    // Update the state (position) of the shapes ready for the next run. 
    animate();
}


/* Setup and initialise WebGL (bind to HTML5 canvas) */
function webGLStart() {

    var canvas = document.getElementById("glCanvas");
    
    //Initialise WebGL.
    initGL(canvas);
    
    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();
    
    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initBuffers();

	// Set clear color to black, fully opaque.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Enable depth testing.
    gl.enable(gl.DEPTH_TEST);
    
    // Tell WebgL to obscure far things with nearer things.
    gl.depthFunc(gl.LEQUAL);   

	//Actually draw the scene.
    //drawScene();
    
    tick();
    
}