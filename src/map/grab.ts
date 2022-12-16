class Drag {
	speedX:number = 0
	speedY:number = 0
	constructor(public x:number, public y:number, private time:number) {}
	update(x:number, y:number, time:number):void {
		const dx=this.x-x
		const dy=this.y-y
		const dt=time-this.time
		const decayRate=0.003
		const decay=Math.exp(-decayRate*dt)
		this.speedX=this.speedX*decay+dx/dt*(1-decay)
		this.speedY=this.speedY*decay+dy/dt*(1-decay)
		this.time=time
		this.x=x
		this.y=y
	}
}

export default class Grab {
	constructor(
		$surface:HTMLElement,
		stopAnimation:()=>void,
		startFlingAnimation:(speedX:number,speedY:number)=>void,
		pan:(dx:number,dy:number)=>void,
		zoom:(dx:number,dy:number,dz:number)=>void
	) {
		const minSquaredDistanceBetweenPointers=32
		let initialSquaredDistanceBetweenPointers:number|undefined
		let currentRelativeZoom=0
		const pointers=new Map<number,[x:number,y:number]>()
		let drag:Drag|undefined
		const getAveragePosition=():[averageX:number,averageY:number]=>{
			let sumX=0
			let sumY=0
			for (const [x,y] of pointers.values()) {
				sumX+=x
				sumY+=y
			}
			return [
				Math.round(sumX/pointers.size),
				Math.round(sumY/pointers.size)
			]
		}
		const getSquaredDistanceBetweenPointers=():number|undefined=>{
			if (pointers.size<2) return undefined
			const [[x1,y1],[x2,y2]]=pointers.values()
			return Math.max(minSquaredDistanceBetweenPointers,(x2-x1)**2+(y2-y1)**2)
		}
		const respondToPointerSetUpdate=()=>{
			$surface.classList.toggle('grabbed',pointers.size>0)
			if (pointers.size==0) {
				drag=undefined
			} else {
				drag=new Drag(...getAveragePosition(),performance.now())
			}
			initialSquaredDistanceBetweenPointers=getSquaredDistanceBetweenPointers()
			if (pointers.size<=1) {
				currentRelativeZoom=0
			}
		}
		$surface.onpointerdown=ev=>{
			if (ev.isPrimary) pointers.clear()
			if (pointers.size>=2 && !pointers.has(ev.pointerId)) return
			stopAnimation()
			$surface.setPointerCapture(ev.pointerId)
			pointers.set(ev.pointerId,[ev.clientX,ev.clientY])
			respondToPointerSetUpdate()
		}
		$surface.onpointerup=$surface.onpointercancel=ev=>{
			pointers.delete(ev.pointerId)
			if (pointers.size==0 && drag) {
				startFlingAnimation(drag.speedX,drag.speedY)
			}
			respondToPointerSetUpdate()
		}
		$surface.onpointermove=ev=>{
			if (!pointers.has(ev.pointerId)) return
			pointers.set(ev.pointerId,[ev.clientX,ev.clientY])
			if (!drag) return
			const [x,y]=getAveragePosition()
			pan(drag.x-x,drag.y-y)
			drag.update(x,y,performance.now())
			const newSquaredDistanceBetweenPointers=getSquaredDistanceBetweenPointers()
			if (initialSquaredDistanceBetweenPointers && newSquaredDistanceBetweenPointers) {
				const newRelativeZoom=Math.round((
					Math.log2(newSquaredDistanceBetweenPointers**2)-
					Math.log2(initialSquaredDistanceBetweenPointers**2)
				)/2)
				const dz=newRelativeZoom-currentRelativeZoom
				if (dz) zoom(0,0,dz)
				currentRelativeZoom=newRelativeZoom
			}
		}
	}
}
