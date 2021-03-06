/**
 * Copyright 2016-2017 Felix Woitzel. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

onmessage = function(e) {
    var arrayBuffers = [];
    var float32Arrays = [];
    var titles = [];
    var reader = new FileReader();
    reader.onload = function (progressEvent) {
        var before = Date.now();
        var lines = this.result.split('\n');
        var endsWithNewLine = (lines[lines.length - 1] != "");
        var numLines = lines.length - (endsWithNewLine ? 2 : 1);
        var bufferLength = e.data.bufferLength ? e.data.bufferLength : (512 * 512); // defaulting to 2M
        var numChunks = Math.ceil(numLines/bufferLength);
        var statshtml = numLines + " samples loaded<br />";
        titles = lines[0].split('\t');
        var min = []; max = []; avg = [];
        for(var title = 0; title < titles.length; title++){
            min[title] = Number.POSITIVE_INFINITY;
            max[title] = Number.NEGATIVE_INFINITY;
            avg[title] = 0;
            arrayBuffers[title] = new ArrayBuffer(numLines*4);
            float32Arrays[title] = new Float32Array(arrayBuffers[title]);
        }
        var progress = 0;
        for (var line = 1; line < numLines; line++) {
            var newProgress = Math.floor(100 * line / (lines.length+1));
            if(newProgress != progress){
                progress = newProgress;
                postMessage({statshtml: "parsing " + progress + "%<br/>"});
            }
            val = lines[line].split('\t');
            for(var title = 0; title < titles.length; title++){
                var v = Number(val[title]);
                if(min[title] > v){
                    min[title] = v;
                }
                if(max[title] < v){
                    max[title] = v;
                }
                if(avg[title] == undefined){
                    avg[title] = 0;
                }
                avg[title] += v /(lines.length-1);
                float32Arrays[title][line-1] = v;
            }
        }
        var escapedTitles = [];
        for(var title = 0; title < titles.length; title++){
            var escapedTitle = titles[title].replace(/"/g,'');
            escapedTitles.push(escapedTitle);
            statshtml += escapedTitle + ": "
                + min[title] + " - " + max[title] + " ("
                + Math.round(avg[title]*10)/10 + ") <br/>";
        }
        statshtml += "parsing time [ms]: " + (Date.now() - before) + "<br/>";
        postMessage({
                statshtml: statshtml,
            });

        before = Date.now();
        var strideTitles = e.data.strideTitles ? e.data.strideTitles : [1,2,3,4];
        var stridedArrayBuffers = [];
        var stridedFloat32Arrays = [];
        for(var chunkIndex = 0; chunkIndex < numChunks; chunkIndex++){
            stridedArrayBuffers[chunkIndex] = new ArrayBuffer(bufferLength * 16); // 4x4 for four float32 values of four bytes for the values for the given stride indices
            stridedFloat32Arrays[chunkIndex]  = new Float32Array(stridedArrayBuffers[chunkIndex]);
        }
        var normalization = e.data.normalization;
        if(normalization == null){
            normalization = {
                scale: Math.max(
                    (max[strideTitles[0]]-min[strideTitles[0]]),
                    (max[strideTitles[1]]-min[strideTitles[1]]),
                    (max[strideTitles[2]]-min[strideTitles[2]])
                ),
                offsetX: avg[strideTitles[0]],
                offsetY: avg[strideTitles[1]],
                offsetZ: avg[strideTitles[2]],
                offsetT: avg[strideTitles[3]],
           }

        }
        var maxScale = Math.max(
                (max[strideTitles[0]]-min[strideTitles[0]]),
                (max[strideTitles[1]]-min[strideTitles[1]]),
                (max[strideTitles[2]]-min[strideTitles[2]])
            );

        progress = -1;
        for (var line = 0; line < numLines; line++) {
            var newProgress = Math.floor(100 * line / (lines.length+1));
            if(newProgress != progress){
                progress = newProgress;
                postMessage({statshtml: statshtml + "normalize into strided array chunks: " + progress + "%<br/>"});
            }
            var chunkIndex = Math.floor(line/bufferLength);
            var chunkLine = line - chunkIndex * bufferLength;
            var stridedFloat32Array = stridedFloat32Arrays[chunkIndex];
            stridedFloat32Array[chunkLine*4 + 0] = (float32Arrays[strideTitles[0]][line]-normalization.offsetX)/normalization.scale;
            stridedFloat32Array[chunkLine*4 + 1] = (float32Arrays[strideTitles[1]][line]-normalization.offsetY)/normalization.scale;
            stridedFloat32Array[chunkLine*4 + 2] = (float32Arrays[strideTitles[2]][line]-normalization.offsetZ)/normalization.scale;
            stridedFloat32Array[chunkLine*4 + 3] = (float32Arrays[strideTitles[3]][line]-normalization.offsetT)/normalization.scale;
        }
        statshtml += "normalize into strided array chunks [ms]: "+ (Date.now() - before) + "<br/>";
        postMessage({
                statshtml: statshtml,
                stats: {min: min, max: max, avg: avg},
                normalization: normalization,
                titles: escapedTitles,
                numLines: numLines,
                numChunks: numChunks,
                arrayBuffers: arrayBuffers,
                bufferLength: bufferLength,
                stridedArrayBuffers: stridedArrayBuffers,
                file: e.data.file
            }, arrayBuffers.concat(stridedArrayBuffers));
    };
    reader.readAsText(e.data.file);
}
