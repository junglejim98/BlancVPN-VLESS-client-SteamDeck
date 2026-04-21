export namespace main {
	
	export class DependencyStatus {
	    ready: boolean;
	    xray: boolean;
	    tun2socks: boolean;
	    xrayConfigDir: boolean;
	    v2rayConfigDir: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new DependencyStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ready = source["ready"];
	        this.xray = source["xray"];
	        this.tun2socks = source["tun2socks"];
	        this.xrayConfigDir = source["xrayConfigDir"];
	        this.v2rayConfigDir = source["v2rayConfigDir"];
	        this.message = source["message"];
	    }
	}
	export class ServerOption {
	    id: string;
	    label: string;
	    url: string;
	    host: string;
	    latencyMs: number;
	
	    static createFrom(source: any = {}) {
	        return new ServerOption(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.url = source["url"];
	        this.host = source["host"];
	        this.latencyMs = source["latencyMs"];
	    }
	}
	export class VpnBootstrapData {
	    servers: ServerOption[];
	    selectedUrl: string;
	    providerName: string;
	    dependenciesInstalled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new VpnBootstrapData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.servers = this.convertValues(source["servers"], ServerOption);
	        this.selectedUrl = source["selectedUrl"];
	        this.providerName = source["providerName"];
	        this.dependenciesInstalled = source["dependenciesInstalled"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

