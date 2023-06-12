const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("online"));
app.listen(3000, () => console.log("Online.") );

/** 
 * by me
 * 
 * This is a little integration with Discord's API that simulates Uncyclopedia's recentchanges special
 * page, with live alterations log.
 * 
 * *************
 * @todo:
 *      -slash commands que retornam contribs dos desciclopes
 *      -avisos personalizados de votações no status do bot
 *      -melhorar os logs de desfazer, mover e outros
 *      -resolver o problema dos bytes negativos
 *      -corrigir o horario pra -03
 * 
 *      -LOGACTION:
 *          -upload
 * 
 * too lazy to translate it to English lol
 * 
 * *************
 * 
 */


const { botUsername, botPassword, token, webhookURL } = require('./config.json');

//to log into
const MWBot = require('mwbot');
const bot = new MWBot({
    apiUrl: 'https://desciclopedia.org/api.php'
});

bot.loginGetEditToken({
    username: botUsername,
    password: botPassword
});


//Encontrando e setando o webhook
const { Client, Intents, MessageEmbed, WebhookClient } = require("discord.js");
client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const webhookClient = new WebhookClient({ url: webhookURL });

var oldEdit = ''; //memoria
setInterval(() =>{

    getRecentChanges(bot).then((response) =>{
        console.log(`[OLDEDIT] Revid: ${oldEdit.revid};\n User: ${oldEdit.user};\n Type: ${oldEdit.type};\n Logaction: ${oldEdit.logaction}`);

        const edit = response.query.recentchanges["0"];

        //Comparar os IDs das edições
        if(edit.rcid === oldEdit.rcid) {
            console.log(`Nenhuma nova edição detectada.`);
        }


        else{

            console.log(`[EDIÇÃO ATUAL] Revid: ${edit.revid};\n User: ${edit.user};\n Type: ${edit.type};\n Logaction: ${edit.logaction}`);

            //Obtendo os dados da edição atual
            const edTitle = edit.title;         //Página
            const edUser = edit.user;           //Autor da edição

            const edCurid = edit.pageid;        //Id da página
            const edDiff = edit.revid;          //Estado atual da página
            const edOldid = edit.old_revid;     //Estado anterior da página


            //Sumário da edição
            var edSummary = "(" + edit.comment + ")";
            if(edit.comment == ''){
                edSummary = '';
            }


            //Data e hora da edição
            var edTimestamp = edit.timestamp 

            edTimestamp = edTimestamp.slice(edTimestamp.indexOf("T"))
                .replace(/([A-Z]|[a-z]|\D)/g, "");

            edTimestamp = edTimestamp.slice(0, 2) + "h" + edTimestamp.slice(2, 4) + "min";


            //Diferença em bytes
            var edBytes = Number(edit.oldlen) - Number(edit.newlen); 

            if(Number(edit.newlen) < Number(edit.oldlen)){
                edBytes = -edBytes;
            }
            else if(Number(edit.newlen) == Number(edit.old_len)){
                return edBytes;
            }
            else{
                edBytes = +edBytes;
            }


            //Modelo cru da mensagem
            var embedDescription = `${edUser} realizou uma edição em ${edTitle}. ${edSummary}`;
            var embedColor = "WHITE";


            //Criação de novas páginas
            if(edit.type == 'new'){
                edBytes = +edBytes;

                embedColor = "AQUA";
                embedDescription = `${edUser} criou a página ${edTitle}, com ${edBytes}b. ${edSummary}`;
            }


            //Tipo de ação tomada para outros tipos de edição
            const edActionType = edit.logaction; 

            switch(edActionType){
                case 'delete':
                    embedColor = "RED";
                    embedDescription = `${edUser} deletou a página [[${edTitle}]]. ${edSummary}`;
                break;

                case 'undo':

                break;

                case 'move':
                    embedColor = "YELLOW";
                    embedDescription = `${edUser} moveu ${edTitle} → ${edit.logparams.target_title} ${edSummary}`;
                break;

                default:
                    embedDescription = `
                        ([dif](<https://desciclopedia.org/index.php?title=${edTitle.replace(/\s/g, "_")}&curid=${edCurid}&diff=${edDiff}&oldid=${edOldid}>) | [his](<https://desciclopedia.org/index.php?title=${edTitle.replace(/\s/g, "_")}&curid=${edCurid}&action=history>)) • [${edTitle}](<https://desciclopedia.org/wiki/${edTitle.replace(/\s/g, "_")}>); ${edTimestamp} • [ ${edBytes} ] • [${edUser}](<https://desciclopedia.org/wiki/User:${edUser.replace(/\s/g, "_")}>) ([disc](<https://desciclopedia.org/wiki/User_talk:${edUser.replace(/\s/g, "_")}>) | [ctribs](<https://desciclopedia.org/wiki/Especial:Contribuições/${edUser.replace(/\s/g, "_")}>)) ${edSummary.replace(/\//g, "").replace(/\*/g, "")}
                    `;
                    embedColor = "GREEN";
                break;

            }

            const embed = new MessageEmbed().setDescription(embedDescription).setColor(embedColor);
            webhookClient.send({ embeds: [embed] });

            oldEdit = edit;
        }
    });

}, 10000);



/*client.once('ready', async () =>{
    console.log(`Logado como ${client.user.tag}.`);

    const channel = client.channels.cache.get('934217633761480725');
	try {
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.find(wh => wh.token);

		if (!webhook) return console.log('Nenhum webhook encontrado.');

		await webhook.send({ embeds: [embed] });

	} catch (error) {
		console.error('Error trying to send a message: ', error);
	}
});*/

/*client.on('messageCreate', async msg =>{
    console.log(msg.content);

    if(msg.channel.id === "934217633761480725" && !msg.author.bot) {
        getRecentChanges(bot).then((response) =>{
            console.log(response.query.recentchanges);

            var message = JSON.stringify(response.query.recentchanges);
            msg.channel.send(message);
        });
    }
});*/

client.login(token);

async function getRecentChanges(bot){
    return bot.request({
        action: "query",
        list: "recentchanges",
        rcprop: "title|ids|sizes|flags|user|comment|timestamp|flags|loginfo",
        rclimit: "1",
        format: "json"
    });
}