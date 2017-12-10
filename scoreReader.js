inlets = 1;
outlets = 5;

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

	outlet(0,"jit_matrix",monoMatrix.name);
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
	blank=true;
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
	//outlet(0,"jit_matrix",sum.name);

	outlet(2,["bang"]);
}

function findStaveData(hold){

	outlet(1,["bang"]);

	var staveData = {raw:[],edges:[],delta:[],bounds:[]};
	var delta = 0;
	var valueUsed = false;

	for(i=0;i<monoMatrix.dim[1];i++){
		if(monoMatrix.getcell(horizontalBounds[0]+1,i)>0){
			staveData.raw[staveData.raw.length] = i;
		}
	}
	staveData.edges[0]={location:staveData.raw[0],thickness:1};
	for(i=1;i<staveData.raw.length;i++){
		if(staveData.raw[i]-staveData.raw[(i-1)]>1){
			staveData.edges[staveData.edges.length]={location:staveData.raw[i],thickness:1};
			delta = staveData.edges[(staveData.edges.length-1)].location-staveData.edges[(staveData.edges.length-2)].location;
			if(staveData.delta.length == 0){
				staveData.delta[0] = {value:delta,count:1,edgeIndex:[(staveData.edges.length-1)]};
			}else{
				valueUsed = false
				for(j=0;j<staveData.delta.length;j++){
					if(staveData.delta[j].value==delta){
						staveData.delta[j].count+=1;
						staveData.delta[j].edgeIndex[staveData.delta[j].edgeIndex.length]=staveData.edges.length-1;
						valueUsed=true;
					}else if(valueUsed==false&&j==staveData.delta.length-1){
						staveData.delta[staveData.delta.length] = {value:delta,count:1,edgeIndex:[(staveData.edges.length-1)]};
					}
				}
			}
		}else{
			staveData.edges[(staveData.edges.length-1)].thickness+=1;
		}
	}
	//find most common length
	var largest = {index:0,value:0};
	for(i=0;i<staveData.delta.length;i++){
		if(staveData.delta[i].count>largest.value){
			largest.index=i
			largest.value=staveData.delta[i].count;
		}
	}
	for(i=0;i<staveData.delta[largest.index].edgeIndex.length;i++){
		if(i==0&&staveData.edges[staveData.delta[largest.index].edgeIndex[i]].location-staveData.edges[staveData.delta[largest.index].edgeIndex[i]-1].location==staveData.delta[largest.index].value){
			staveData.bounds[staveData.bounds.length]=[[horizontalBounds[0],staveData.edges[(staveData.delta[largest.index].edgeIndex[i])-1].location],[horizontalBounds[1],staveData.edges[(staveData.delta[largest.index].edgeIndex[i])-1].location+staveData.edges[(staveData.delta[largest.index].edgeIndex[i])-1].thickness]]
		}else if(i%4==0&&staveData.edges[staveData.delta[largest.index].edgeIndex[i]].location-staveData.edges[staveData.delta[largest.index].edgeIndex[i]-1].location==staveData.delta[largest.index].value){
			staveData.bounds[staveData.bounds.length]=[[horizontalBounds[0],staveData.edges[(staveData.delta[largest.index].edgeIndex[i])-1].location],[horizontalBounds[1],staveData.edges[(staveData.delta[largest.index].edgeIndex[i])-1].location+staveData.edges[(staveData.delta[largest.index].edgeIndex[i])-1].thickness]]
		}
		staveData.bounds[staveData.bounds.length]=[[horizontalBounds[0],staveData.edges[staveData.delta[largest.index].edgeIndex[i]].location],[horizontalBounds[1],staveData.edges[staveData.delta[largest.index].edgeIndex[i]].location+staveData.edges[staveData.delta[largest.index].edgeIndex[i]].thickness]]
	}

	var tempMatrix = new JitterMatrix(1,"char",monoMatrix.dim[0],monoMatrix.dim[1]);
	var monoMirror = new JitterMatrix(1,"char",monoMatrix.dim[0],monoMatrix.dim[1]);
	var sumDump = new JitterMatrix(1,"char",monoMatrix.dim[0],monoMatrix.dim[1]);
	monoMirror.frommatrix(monoMatrix);
	var operator = new JitterObject("jit.expr");
	operator.expr="(in[0]<0.5)&&(in[1]>0.5)";

	for(i=0;i<staveData.bounds.length;i++){
		for(x=staveData.bounds[i][0][0];x<staveData.bounds[i][1][0];x++){
			for(y=staveData.bounds[i][0][1];y<staveData.bounds[i][1][1];y++){
				tempMatrix.setcell2d(x,y,255);
			}
		}
	}

	operator.matrixcalc([tempMatrix,monoMirror],sumDump);
	var staveCrossings = [];

	var throwaway = new JitterMatrix(1,"char",(monoMatrix.dim[0]-horizontalBounds[0]),1)
	var bounce = new JitterMatrix(1,"char",(monoMatrix.dim[0]-horizontalBounds[0]),(staveData.bounds.length/5*12))
	var composite = new JitterMatrix(2,"char",(monoMatrix.dim[0]-horizontalBounds[0]),(staveData.bounds.length/5*12))
	
	throwaway.usesrcdim=1;
	composite.usedstdim=1;

	var index=0;

	/*for(i=0;i<(staveData.bounds.length/5*9);i++){
		throwaway.srcdimstart=[horizontalBounds[0],staveData.bounds[index][0][1]-((2/3)*(staveData.delta[largest.index].value))+(((i%2)*(staveData.delta[largest.index].value))/3)]
		throwaway.srcdimend=[horizontalBounds[1]-horizontalBounds[0],1+(staveData.bounds[index][0][1]-((2/3)*(staveData.delta[largest.index].value))+(((i%2)*(staveData.delta[largest.index].value))/3))]
		
		throwaway.frommatrix(monoMatrix);

		composite.dstdimstart=[0,i];
		composite.dstdimend=[monoMatrix.dim[0]-horizontalBounds[0],i+1]
		composite.frommatrix(throwaway);
		
		if(i%2==0&&i!=0){
			index+=1;
		}

		bounce.frommatrix(composite);
		throwaway.clear();

	}*/

	throwaway.srcdimstart=[horizontalBounds[0],staveData.bounds[0][1][1]]
	throwaway.srcdimend=[horizontalBounds[1],(staveData.bounds[0][1][1])+1]
	throwaway.frommatrix(monoMatrix);

	composite.usedstdim=1;
	composite.dstdimstart=[0,0];
	composite.dstdimend=[monoMatrix.dim[0]-horizontalBounds[0],0]
	composite.frommatrix(throwaway);

	throwaway.clear();

	throwaway.srcdimstart=[horizontalBounds[0],staveData.bounds[1][1][1]]
	throwaway.srcdimend=[horizontalBounds[1],(staveData.bounds[1][1][1])+1]
	throwaway.frommatrix(monoMatrix);

	composite.usedstdim=1;
	composite.dstdimstart=[0,1];
	composite.dstdimend=[monoMatrix.dim[0]-horizontalBounds[0],1]
	composite.frommatrix(throwaway);

	throwaway.clear();

	throwaway.srcdimstart=[horizontalBounds[0],staveData.bounds[2][1][1]]
	throwaway.srcdimend=[horizontalBounds[1],(staveData.bounds[2][1][1])+1]
	throwaway.frommatrix(monoMatrix);

	composite.usedstdim=1;
	composite.dstdimstart=[0,2];
	composite.dstdimend=[monoMatrix.dim[0]-horizontalBounds[0],2]
	composite.frommatrix(throwaway);

	throwaway.clear();

	throwaway.srcdimstart=[horizontalBounds[0],staveData.bounds[3][1][1]]
	throwaway.srcdimend=[horizontalBounds[1],(staveData.bounds[3][1][1])+1]
	throwaway.frommatrix(monoMatrix);

	composite.usedstdim=1;
	composite.dstdimstart=[0,3];
	composite.dstdimend=[monoMatrix.dim[0]-horizontalBounds[0],3]
	composite.frommatrix(throwaway);

	throwaway.clear();
	
	outlet(0,"jit_matrix",composite.name);

	/*var j=0;
	var cross = false
	var y = 0;

	for(i=0;i<staveData.bounds.length;i++){
		cross=false
		j = staveData.bounds[i][0][0];
		y = staveData.bounds[i][1][1]+1;

		while(cross==false){
			if(sumDump.getcell(j,y)>0){
				cross=true;
				staveCrossings[staveCrossings.length]=[j,y];
				/*if(staveCrossings.length>=1){
					for(k=0;k<staveCrossings.length;k++){
						if(y==staveCrossings[k][1]){
							var tar=true
						}else if(k==(staveCrossings.length-1)&&isUsed!=true){
							staveCrossings[staveCrossings.length]=[j,y];							
						}
					}
				}else{
					staveCrossings[staveCrossings.length]=[j,y];	
				}
			}else if(j>0.5*horizontalBounds[1]){
				cross=true;
				staveCrossings[staveCrossings.length]=[-1,-1];
			}
			j++
		}
	}
	post(staveCrossings.length);
	var comparison = 0
	for(i=0;i<(staveCrossings.length/5);i++){
		comparison=staveCrossings[(i*5)+1][0]-staveCrossings[(i*5)+2][0]
		if(comparison>0){
			post("trebleClef");
		}else if(comparison<0){
			post("bassClef");
		}else{
			post("cClef");
		}
	}

	var currentState = false;

	post(staveData.bounds[1][0][1]-staveData.bounds[0][1][1])
	if((staveData.bounds[1][0][1]-staveData.bounds[0][1][1])%3!=0){

	}

	/*for(i=horizontalBounds[0];i<horizontalBounds[1];i++){

	}*/


	//outlet(0,"jit_matrix",sumDump.name);
	outlet(2,["bang"]);
}

function findClefData(hold){

}









