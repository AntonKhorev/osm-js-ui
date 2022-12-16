export default class Drag {
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
	get isMoving():boolean {
		return this.speedX!=0 || this.speedY!=0
	}
}
