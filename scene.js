import * as THREE from './three/three.module.js';
import { OrbitControls } from './three/OrbitControls.js';
import { GLTFLoader } from './three/GLTFLoader.js';
import { VRButton } from './three/VRButton.js';

import { Water } from './water.js';
import { Sky } from './sky.js';

window.addEventListener('load',function(){
    init();
});

let scene,camera,renderer;
let orbitControls;

let water;

function init(){
    // Create renderer
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth,window.innerHeight);

    // Canvas to renderer
    const container = document.querySelector('#renderCanvas');
    container.appendChild(renderer.domElement);

    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,1000);
    camera.position.set(0,0,0.1);
    //camera.lookAt(new THREE.Vector3(0, 0, 1));
    scene.add(camera);

    // Create orbitControls
    document.addEventListener('touchmove',function(e){e.preventDefault();},{passive: false});
    orbitControls = new OrbitControls(camera,renderer.domElement);
    //orbitControls.target.set(0,0,-1);
    //orbitControls.update();

    // Create light
    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);

    // for window resize
    window.addEventListener('resize',function(){
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth,window.innerHeight);
    },false);

    // setAxesAndGrid();

    // Create world
    setSea();
    setSky();
    //setStar();
    setModel();

    // For WebVR
    document.body.appendChild( VRButton.createButton(renderer) );
    renderer.xr.enabled = true;

    rendering();
}

function setAxesAndGrid(){
    const axes = new THREE.AxesHelper(1000);
    axes.position.set(0,0,0);
    scene.add(axes);

    const grid = new THREE.GridHelper(100,100);
    scene.add(grid);
}

function rendering(){
    //requestAnimationFrame(rendering);
    renderer.setAnimationLoop(rendering);

    water.material.uniforms['time'].value += 1.0/(60.0*50.0);

    //orbitControls.update();

    TWEEN.update();

    renderer.render(scene,camera);
}

function setSea(){
    const waterGeometry = new THREE.PlaneBufferGeometry(1000,1000);
    
    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load( './assets/water/Water_1_M_Normal.jpg', function(texture){
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            } ),
            alpha: 1.0,
            waterColor: "rgb(255, 0, 0)", 
            distortionScale: 3.7,
            fog:scene.fog !== undefined
        }
    );
    
    water.rotation.x = - Math.PI / 2;
    water.position.y = -1;

    scene.add(water);
}

let gui;
const effectController = {
    turbidity: 0.1,
    rayleigh: 0.01,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    inclination: 0.425, // elevation / inclination
    azimuth: 0.25, // Facing front,
    exposure: 0.5 // renderer.toneMappingExposure
};
function setSky(){
    let sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    let sun = new THREE.Vector3();

    function guiChanged() {
        const uniforms = sky.material.uniforms;
        uniforms[ "turbidity" ].value = effectController.turbidity;
        uniforms[ "rayleigh" ].value = effectController.rayleigh;
        uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
        uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;

        const theta = Math.PI * ( effectController.inclination - 0.5 );
        const phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

        sun.x = Math.cos( phi );
        sun.y = Math.sin( phi ) * Math.sin( theta );
        sun.z = Math.sin( phi ) * Math.cos( theta );

        uniforms[ "sunPosition" ].value.copy( sun );

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render( scene, camera );
    }

    gui = new dat.GUI();
    let folder = gui.addFolder('Sky');

    folder.add( effectController, "turbidity", 0.0, 20.0, 0.1 ).onChange( guiChanged );
    folder.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
    folder.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange( guiChanged );
    folder.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged );
    folder.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
    folder.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged );
    folder.add( effectController, "exposure", 0, 1, 0.0001 ).onChange( guiChanged );

    guiChanged();
}

// function setStar(){
//     const geometry = new THREE.Geometry(); // not available three.js r125-
//     const SIZE = 3000;
//     const LENGTH = 1000;
//     for (let i = 0; i < LENGTH; i++) {
//         geometry.vertices.push(new THREE.Vector3(
//             SIZE * (Math.random() - 0.5),
//             SIZE * (Math.random() - 0.5),
//             SIZE * (Math.random() - 0.5),
//         ));
//     }

//     const material = new THREE.PointsMaterial({
//         size: 10,
//         color: 0xFFFFFF,
//     });

//     const mesh = new THREE.Points(geometry, material);
//     scene.add(mesh);
// }

function setModel(){
    console.log("setModel...");
    loadTexture();

    renderer.gammaFactor = 2.2;
    renderer.outputEncoding = THREE.LinearEncoding;
    //renderer.outputEncoding = THREE.sRGBEncoding;
}

function loadTexture(){
    console.log("loadTexture...");
    
    const loader = new THREE.TextureLoader();
    loader.load(
        // resource URL
        './assets/model/Map-COL.jpg',
        // onLoad callback
        function ( texture ) {
            loadModel(texture);
        },
        // onProgress callback currently not supported
        undefined,
        // onError callback
        function ( error ) {
            console.error( 'An error happened.' );
            console.log(error);
        }
    );
}

function loadModel(texture){
    console.log("loadModel...");

    let model = null;
    const loader = new GLTFLoader();
    loader.load(
        // resource URL
        "./assets/model/LeePerrySmith.glb",
        // called when the resource is loaded
        function ( gltf ){
            model = gltf.scene;
            model.name = "model-face";
            // model.scale.set(1.0, 1.0, 1.0);
            // model.position.set(0,0,0);

            // Set texture and
            gltf.scene.traverse( function ( child ) {
                if ( child.isMesh ) {
                    let model2 = child.clone();

                    // Set model on random position
                    for (let index = 0; index < 20; index++) {
                        setRandomModel(child)
                    }

                    // Set big model
                    child.position.z = -400.0
                    child.position.y = -1.0
                    child.rotation.x = -(1/2)*Math.PI;
                    child.rotation.y = (1/6)*Math.PI;
                    child.rotation.z = (1/2)*Math.PI;
                    child.material.map = texture;
                    //console.log("mat-color:",child.material.color);
                    //child.material.color = new THREE.Color("rgb(255, 255, 255)");
                    //child.material.color = new THREE.Color( 1.0, 1.0, 1.0 )
                    //child.material.envMap = envMap;
                    child.scale.set(20,20,20);

                    setColorGui(child);

                    // Set model in front
                    model2.position.x = -0.3
                    model2.position.y = -2.1
                    model2.position.z = 8.0
                    model2.rotation.y = Math.PI;

                    tweenModel(model2, 8000);
                    scene.add( model2 );
                }
            });

            scene.add( model );
            //scene.add( model2 );
        },
        // called while loading is progressing
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has error
        function ( error ) {
            console.log('An error happened');
            console.log(error);
        }
    );
}

function setColorGui(mesh){
    let folder = gui.addFolder('Head');

    let params = {
        //color: 0xffffff,
        r: 1.0,
        g: 1.5,
        b: 2.0,
    };

    function colorChanged() {
        mesh.material.color = new THREE.Color( params.r, params.g, params.b );
    }

    folder.add( params, "r", 0.0, 5.0, 0.01 ).onChange( colorChanged );
    folder.add( params, "g", 0.0, 5.0, 0.01 ).onChange( colorChanged );
    folder.add( params, "b", 0.0, 5.0, 0.01 ).onChange( colorChanged );

    colorChanged();
}

function tweenModel(mesh, msec){
    const posSrc = {pos:-3};
    let tween = new TWEEN.Tween( posSrc )
        .to( { pos: -1 }, msec )
        .easing( TWEEN.Easing.Cubic.InOut )
        .yoyo(true)
        .repeat(Infinity)
        .onUpdate(function() {
            mesh.position.y = posSrc.pos;
        } )
        .start();
}

function setRandomModel(mesh){
    let model = mesh.clone();

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
    }

    model.position.x = getRandomInt(-100, 100)
    model.position.z = getRandomInt(0, 100)
    model.rotation.y = Math.PI;

    tweenModel(model, getRandomInt(3000, 12000));
    scene.add( model );
}