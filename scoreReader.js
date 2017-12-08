inlets = 1;
outlets = 3;

var monoMatrix, score, initMatrix, planeReducer, noiseReducer, scaningMatrix, sumCalc, horizontalBounds;

function loadImage(filename){

	outlet(1,["bang"]);
	
	//Load file into jit.qt.movie
	score = new JitterObject("jit.qt.movie");
	score.adapt = 1;
	score.read(filename);
	initMatrix = new JitterMatrix(4,"char");
	score.matrixcalc(initMatrix,initMatrix);
	
	monoMatrix = new JitterMatrix(1,"char",initMatrix.dim[0],initMatrix.dim[1]);
	planeReducer = new JitterObject("jit.rgb2luma");
	noiseReducer = new JitterObject("jit.expr");
	noiseReducer.expr = "(in[0]<0.75)";

	planeReducer.matrixcalc(initMatrix,monoMatrix);
	noiseReducer.matrixcalc(monoMatrix,monoMatrix);

	//outlet(0,"jit_matrix",monoMatrix.name);
	outlet(2,["bang"]);

}

function findBounds(hold){

	outlet(1,["bang"]);

	horizontalBounds = []

	var operator = new JitterObject("jit.expr")
	operator.expr = "(in[0]>0.75)&&(in[1]>0.75)";
	var sum = new JitterMatrix(1,"char",monoMatrix.dim[0],monoMatrix.dim[1]);
	sumCalc = new JitterObject("jit.3m");

	scaningMatrix = new JitterMatrix(1,"char",monoMatrix.dim[0],1);

	var blank = true;
	var i = 0;
	while(blank==true){
		
		scaningMatrix.clear();
		scaningMatrix.setcell2d(i,0,255);

		operator.matrixcalc([monoMatrix,scaningMatrix],sum);
		sumCalc.matrixcalc(sum,sum);

		if(sumCalc.max>0||i>monoMatrix.dim[0]){
			horizontalBounds[0]=i;
			blank=false;
		}
		i+=1;
	}

	i=monoMatrix.dim[0];

	while(blank==true){

		scaningMatrix.clear();
		scaningMatrix.setcell2d(i-1,0,255);

		operator.matrixcalc([monoMatrix,scaningMatrix],sum);
		sumCalc.matrixcalc(sum,sum);

		if(sumCalc.max>0||i<0){
			horizontalBounds[1]=i;
			blank=false;
		}
		i-=1;
	}

	//outlet(1,"jit_matrix",scaningMatrix.name);
	//outlet(0,"jit_matrix",monoMatrix.name);
	//outlet(2,"jit_matrix",sum.name);

	outlet(2,["bang"]);
}

function findStaveData(hold){

	outlet(1,["bang"]);

	var staveData = {raw:[],edges:[],delta:[]};
	var delta = 0;
	var valueUsed = false;

	for(i=0;i<monoMatrix.dim[1];i++){
		if(monoMatrix.getcell(horizontalBounds[0]+1,i)>0){
			staveData.raw[staveData.raw.length] = i;
		}
	}
	staveData.edges[0]=staveData.raw[0];
	for(i=1;i<staveData.raw.length;i++){
		if(staveData.raw[i]-staveData.raw[(i-1)]>1){
			staveData.edges[staveData.edges.length]=staveData.raw[i];
			delta = staveData.edges[(staveData.edges.length-1)]-staveData.edges[(staveData.edges.length-2)];
			if(staveData.delta.length == 0){
				staveData.delta[0] = {value:delta,count:1,arrayIndex:[i]};
			}else{
				valueUsed = false
				for(j=0;j<staveData.delta.length;j++){
					if(staveData.delta[j].value==delta){
						staveData.delta[j].count+=1;
						staveData.delta[j].arrayIndex[staveData.delta[j].arrayIndex.length]=i;
						valueUsed=true;
					}else if(valueUsed==false&&j==staveData.delta.length-1){
						staveData.delta[staveData.delta.length] = {value:delta,count:1,arrayIndex:[i]};
					}
				}
			}
		}
	}
	outlet(2,["bang"]);
}

