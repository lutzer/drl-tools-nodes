const mic = require('mic')
const _ = require('lodash')

module.exports = function(RED) {
    function ToolsMicNode(config) {
        RED.nodes.createNode(this,config)
        var node = this;

        const micInstance = mic({
            rate: config.sampleRate,
            channels: config.channels,
            debug: false,
            exitOnSilence: 0,
            device: !_.isEmpty(config.device) ? config.device : undefined
        })

        const micInputStream = micInstance.getAudioStream();
        micInputStream.on('data', (chunk) => {
            node.send([null, {topic: 'data', payload: chunk }])
        })
        micInputStream.on('pauseComplete', () => {
            node.send([{topic: 'stop'}, null])
        })


        var started = false
        node.on('input', function(msg) {
            if (msg.topic == 'start') {
                node.send([{topic: 'start', config: config}, null])
                if (!started) {
                    micInstance.start()
                    started = true
                } else {
                    micInstance.resume()
                }
            } else if (msg.topic == 'stop') {
                micInstance.pause()
            }
        })
    }
    RED.nodes.registerType("tools-mic", ToolsMicNode)
}