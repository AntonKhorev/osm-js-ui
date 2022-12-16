const curveParameter=0.002 // [px/ms^2]
const dragStepThreshold=32 // [px]
const maxMoveDistanceWithoutCrossFade=2048 // [px]
const crossFadeMoveDistance=1024 // [px]

class AnimationAxisState {
	constructor(
		public startAxisPosition:number,
		public decayAxisOffset:number,
		public decayDistance:number,
		public startTime:number,
		public decayStartTime:number,
		public decayDuration:number
	) {}
	transitionToDecay(time:number):void {
		if (time<this.decayStartTime) {
			this.decayStartTime=time
		}
	}
	isLinear(time:number):boolean {
		return time<this.decayStartTime
	}
	isEnded(time:number):boolean {
		return time>=this.decayStartTime+this.decayDuration
	}
	getAxisPosition(time:number):number {
		let linearTime=time-this.startTime
		if (time>this.decayStartTime) {
			linearTime=this.decayStartTime-this.startTime
		}
		let decayRemainingTime=this.decayDuration
		if (time>this.decayStartTime) {
			decayRemainingTime-=(time-this.decayStartTime)
		}
		if (decayRemainingTime<0) {
			decayRemainingTime=0
		}
		const axisDirection=this.decayAxisOffset/this.decayDistance
		return (
			this.startAxisPosition +
			axisDirection*linearTime +
			this.decayAxisOffset-axisDirection*curveParameter*decayRemainingTime**2
		)
	}
}

export default class Animation {
	private requestId:number|undefined
	private _xAxis:AnimationAxisState|undefined
	private _yAxis:AnimationAxisState|undefined
	private crossFade?:{
		startTime:number
		duration:number
		stop?:true
	}
	private readonly animateFrame:(time:number)=>void
	constructor(
		private readonly getPosition:()=>[x:number,y:number],
		crossFadeCallback:(crossFadeProgress:number)=>void,
		moveCallback:(x:number,y:number)=>void,
		endCallback:()=>void
	){
		this.animateFrame=(time:number)=>{
			let [x,y]=getPosition()
			let needUpdate=false
			if (this.xAxis) {
				x=this.xAxis.getAxisPosition(time)
				if (this.xAxis.isEnded(time)) {
					this.xAxis=undefined
				}
				needUpdate=true
			}
			if (this.yAxis) {
				y=this.yAxis.getAxisPosition(time)
				if (this.yAxis.isEnded(time)) {
					this.yAxis=undefined
				}
				needUpdate=true
			}
			if (this.crossFade) {
				if (this.crossFade.stop || time-this.crossFade.startTime>this.crossFade.duration) {
					crossFadeCallback(1)
					this.crossFade=undefined
				} else {
					crossFadeCallback((time-this.crossFade.startTime)/this.crossFade.duration)
				}
			}
			if (needUpdate) {
				moveCallback(x,y)
			}
			if (this.xAxis || this.yAxis) {
				this.requestId=requestAnimationFrame(this.animateFrame)
			} else {
				this.requestId=undefined
				endCallback()
			}
		}
	}
	get xAxis() { return this._xAxis }
	get yAxis() { return this._yAxis }
	set xAxis(xAxis:AnimationAxisState|undefined) {
		this._xAxis=xAxis
		if (this.requestId) return
		this.requestId=requestAnimationFrame(this.animateFrame)
	}
	set yAxis(yAxis:AnimationAxisState|undefined) {
		this._yAxis=yAxis
		if (this.requestId) return
		this.requestId=requestAnimationFrame(this.animateFrame)
	}
	stop() {
		this.xAxis=undefined
		this.yAxis=undefined
		if (this.crossFade) {
			this.crossFade.stop=true
		}
	}
	fling(speedX:number,speedY:number) {
		const speed=Math.sqrt(speedX**2+speedY**2)
		const decayDuration=speed/(2*curveParameter)
		const dp=curveParameter*decayDuration**2
		if (dp<dragStepThreshold) {
			this.xAxis=undefined
			this.yAxis=undefined
		} else {
			const [x,y]=this.getPosition()
			const dx=dp*speedX/speed
			const dy=dp*speedY/speed
			const startTime=performance.now()
			this.xAxis=new AnimationAxisState(
				x,dx,dp,
				startTime,startTime,decayDuration
			)
			this.yAxis=new AnimationAxisState(
				y,dy,dp,
				startTime,startTime,decayDuration
			)
		}
	}
	move(targetX:number,targetY:number):[crossFadeOffsetX:number,crossFadeOffsetY:number]|undefined {
		let [x,y]=this.getPosition()
		let dx=targetX-x
		let dy=targetY-y
		if (dx==0 && dy==0) {
			this.xAxis=undefined
			this.yAxis=undefined
			return
		}
		let decayDistance=Math.sqrt(dx**2+dy**2)
		let crossFadeOffset:[crossFadeOffsetX:number,crossFadeOffsetY:number]|undefined
		if (decayDistance>maxMoveDistanceWithoutCrossFade) {
			const x1=targetX-dx*crossFadeMoveDistance/decayDistance
			const y1=targetY-dy*crossFadeMoveDistance/decayDistance
			crossFadeOffset=[x-x1,y-y1]
			x=x1
			y=y1
			dx=targetX-x
			dy=targetY-y
			decayDistance=crossFadeMoveDistance
			this.crossFade={
				startTime:performance.now(),
				duration:Math.sqrt(decayDistance/curveParameter)
			}
		}
		const decayDuration=Math.sqrt(decayDistance/curveParameter)
		const startTime=performance.now()
		this.xAxis=new AnimationAxisState(
			x,dx,decayDistance,
			startTime,startTime,decayDuration
		)
		this.yAxis=new AnimationAxisState(
			y,dy,decayDistance,
			startTime,startTime,decayDuration
		)
		return crossFadeOffset
	}
	stepX(decayAxisDistance:number) {
		const [x,y]=this.getPosition()
		this.xAxis=this.makeSingleAxisState(x,decayAxisDistance)
	}
	stepY(decayAxisDistance:number) {
		const [x,y]=this.getPosition()
		this.yAxis=this.makeSingleAxisState(y,decayAxisDistance)
	}
	linearStepX(decayAxisDistance:number,linearPhaseDuration:number) {
		const startTime=performance.now()
		if (this.xAxis && this.xAxis.isLinear(startTime)) {
			this.xAxis.decayStartTime=startTime+linearPhaseDuration
		} else {
			const [x,y]=this.getPosition()
			this.xAxis=this.makeSingleAxisState(x,decayAxisDistance,linearPhaseDuration)
		}
	}
	linearStepY(decayAxisDistance:number,linearPhaseDuration:number) {
		const startTime=performance.now()
		if (this.yAxis && this.yAxis.isLinear(startTime)) {
			this.yAxis.decayStartTime=startTime+linearPhaseDuration
		} else {
			const [x,y]=this.getPosition()
			this.yAxis=this.makeSingleAxisState(y,decayAxisDistance,linearPhaseDuration)
		}
	}
	private makeSingleAxisState(startAxisPosition:number,decayAxisOffset:number,linearPhaseDuration:number=0):AnimationAxisState {
		const decayDistance=Math.abs(decayAxisOffset)
		const decayDuration=Math.sqrt(decayDistance/curveParameter)
		const startTime=performance.now()
		return new AnimationAxisState(
			startAxisPosition,decayAxisOffset,decayDistance,
			startTime,startTime+linearPhaseDuration,decayDuration
		)
	}
}
