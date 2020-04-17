/*
* Solution created by: @pedroslopez in addition to @joaomirandasa and @smashah
* This script run similar to brute-force to extract
* available modules on browser;
*
* Copyright @pedroslopez and other contributors
* Licensed under the MIT License
* https://github.com/pedroslopez
* https://github.com/joaomirandasa
* https://github.com/smashah
*
* DO NOT TOUCH THIS FILE IF YOU DON'T KNOW WHAT TO DO
* KEEP-OUT
*/
const igRaid = function(threshold){
    igRaid.mObj = {};
    igRaid.cArr = [];
    igRaid.mGet = null;

    const igRaidExec = () => {
        const EMPTY_SEGMENT_LIMIT = (typeof threshold === 'undefined' ? 1000 : threshold);
        const modules = [];
        const requireModule = window.__r;
        const packModuleId = window.__r.packModuleId;
        let unmatchedSegmentCount = 0;
        let segmentId = 0;
        while(unmatchedSegmentCount < EMPTY_SEGMENT_LIMIT) {
            let localId = 0;
            while(true) {
                try {
                    const packedId = packModuleId({segmentId, localId});
                    const module = {module: requireModule(packedId), packedId, segmentId, localId};
                    modules.push(module);
                    localId++;
                    unmatchedSegmentCount = 0;
                } catch(e) {
                    // console.error("couldnt find module ", {segmentId, localId});
                    break;
                }
            }
            segmentId++;
            if(localId == 0) unmatchedSegmentCount++;
        }
        // console.log(`Found ${modules.length} modules`);
        return modules;
    }

    igRaid.mObj = igRaidExec();

    findModule = function findModule (query) {
        results = [];
        modules = Object.keys(igRaid.mObj);


        modules.forEach(function(mKey) {
            mod = igRaid.mObj[mKey].module;

            if (typeof mod !== 'undefined') {
                if (typeof query === 'string') {
                    if (typeof mod.default === 'object') {
                        for (key in mod.default) {
                            if (key == query) results.push(mod);
                        }
                    }

                    for (key in mod) {
                        if (key == query) results.push(mod);
                    }
                } else if (typeof query === 'function') { 
                    if (query(mod)) {
                        results.push(mod);
                    }
                } else {
                    throw new TypeError('findModule can only find via string and function, ' + (typeof query) + ' was passed');
                }
            }
        });

        return results;
    }

    get = function get (id) {
        return igRaid.mObj[id];
    }

    return {
        modules: igRaid.mObj,
        findModule: findModule,
        get: igRaid.mGet ? igRaid.mGet : get
    };
}

if (typeof module === 'object' && module.exports) {
  module.exports = igRaid;
} else {
  window.iR = igRaid();
}