// A global variable for the WebGL context
var gl;

var shaderProgram;

// Setup the 'model-view' matrix using 'glMatrix' library. - Used to represent the current move/rotate state of the 3D-space. 
var mvMatrix = mat4.create();

// Setup the 'projection' matrix using 'glMatrix' library. 
var pMatrix = mat4.create();

var triangleVertexPositionBuffer;
var squareVertexPositionBuffer;

/* Setup and initialise WebGL (bind to HTML5 canvas) */
function initGL(canvas) {

	// Only continue if WebGL is available and working.
    try {
    
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

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

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
}

/* Actually draws the objects to the WebGL screen. */
function drawScene() {
	
	// Create a new 3x1 vector to translate the model-view matrix by using the 'mat4.translate' function.
 	var translation = vec3.create();

	// Tell WebGL about the size of our <canvas> element. 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
    // Clear the <canvas> in preparation for drawing on it. 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Set-up the camera perspective.
	// Param 1: The matrix that we wish to output to
	// Param 2: 45 degree field of view 
	// Param 2: Width-height ratio of canvas
	// Param 4: Minimum distance from "camera" to render objects (0.1 units)
	// Param 5: Maximum distance from "camera" to render objects (100 units) 
    mat4.perspective(pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

	// "Move" WebGL to the centre of the 3D-space.
    mat4.identity(mvMatrix);
    
    // -- DRAW THE TRIANGLE --

	// Set the components of the 'translation' vector to the given values.
	// We are going to move -1.5 units to the left, and -7 units away from the viewer along the Z axis.
    vec3.set(translation, -1.5, 0.0, -5.0);
    
    // Perform the matrix translation (multiplication) to move the 'model-view' matrix ('mvMatrix') by a given vector/matrix.
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    // Tell WebGL to specify what vertex buffer we want to use to draw. 
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    
    // Next we tell WebGL to use the values in the buffer to draw the vertices (and so the triangle shape)
	// The 'itemSize' property we set on the buffer tells WebGL that each item in the buffer is three numbers long.
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    // Tell WebGL to take account of our 'model-view' and 'projection' matrices (DEFINED IN THE JS SCOPE) in order to pass them to the graphics card. 
    setMatrixUniforms();
    
    // Once this is done, WebGL has an array of numbers that it knows should be treated as vertex positions, and it knows about our matrices. 
    
    // Draw the array of vertices I gave you earlier as triangles, starting with item '0' in the array and going up to the numItems'th element.
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);

    // -- DRAW THE SQUARE --
    
    // Move our 'model-view' matrix 3 units to the right. Remember, we’re currently already 1.5 to the left and 7 away from the screen, so this leaves us 1.5 to the right and 7 away.
    vec3.set(translation, 3.0, 0.0, 0.0);
    
    mat4.translate(mvMatrix, mvMatrix, translation);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    setMatrixUniforms();
    
    // TRIANGLE_STRIP = Strip of triangles where the first three vertices you give specify the first triangle, then the last two of those vertices plus the next one specify the next triangle, and so on..
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
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
    drawScene();
    
}