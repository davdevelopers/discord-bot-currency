const { Client, GatewayIntentBits, Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const mysql = require('mysql');
const fs = require('fs')
require('dotenv').config();

// Load the lastClaimDates map from a file (if it exists)
let lastClaimDates = new Map();

function saveLastClaimDates() {
  // Save the lastClaimDates map to a file
  fs.writeFile('lastClaimDates.json', JSON.stringify([...lastClaimDates]), (err) => {
    if (err) {
      console.error('Error saving lastClaimDates:', err);
    }
  });
}

// Load the lastClaimDates map from a file (if it exists)
if (fs.existsSync('lastClaimDates.json')) {
  try {
    const data = fs.readFileSync('lastClaimDates.json', 'utf8');
    const entries = JSON.parse(data);

    // Convert stored dates from strings to Date objects
    lastClaimDates = new Map(entries.map(([key, value]) => [key, new Date(value)]));
  } catch (err) {
    console.error('Error loading lastClaimDates:', err);
  }
}


const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const PREFIX = '!';

const con = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const commands = [
  {
    name: 'Register',
    description: 'Register as a user.',
    emote: ':pencil:',
  },
  {
    name: 'Ping',
    description: 'Ping command to check bot responsiveness.',
    emote: ':ping_pong:',
  },
  {
    name: 'Profile',
    description: 'Get information about your registered data.',
    emote: ':information_source:',
  },
  {
    name: 'Embeds',
    description: 'Show an example of an embedded message.',
    emote: ':page_facing_up:',
  },
  {
    name: 'Bet',
    description: 'Place a bet and win or lose in a game.',
    emote: ':game_die:',
  },
  {
    name: 'Give',
    description: 'Transfer an amount from your wallet to another user.',
    emote: ':money_with_wings:',
  },
  {
  name: 'Daily',
  description: 'Claim your daily reward.',
  emote: ':calendar:',
  },
  {
    name: 'Help',
    description: 'List all available commands.',
    emote: ':question:',
  },
];



bot.once(Events.ClientReady, async (client) => {
  console.log(`\nClient is ready!\nClient: ${client.user.tag}`);

  try {
    // Connect to MySQL
    await new Promise((resolve, reject) => {
      con.connect((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Connected to MySQL database');
        resolve();
      });
    });

    // Execute SHOW DATABASES query
    const showDatabases = await new Promise((resolve, reject) => {
      con.query('DESC users', (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    // Process the result set
    console.log(showDatabases);
  } catch (error) {
    console.error('Error:', error);
  }

  // Listen for user updates
  bot.on(Events.UserUpdate, async (oldUser, newUser) => {
    const discordUserId = newUser.id;
    const username = newUser.username;
    const tag = newUser.discriminator;

    // Check if the username or tag has changed
    if (username !== oldUser.username || tag !== oldUser.discriminator) {
      // Update the username and tag in the database
      con.query(
        'UPDATE users SET username = ?, tag = ? WHERE discord_id = ?',
        [username, tag, discordUserId],
        (err, result) => {
          if (err) {
            console.error('Error executing query:', err);
            return;
          }

          console.log(`User: ${username}#${tag} updated with username and tag`);
        }
      );
    }
   });

  bot.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const discordUserId = newMember.user.id;
  const username = newMember.user.username;
  const tag = newMember.user.discriminator;

  // Check if the username or tag has changed
  if (username !== oldMember.user.username || tag !== oldMember.user.discriminator) {
    // Update the username and tag in the database
    con.query(
      'UPDATE users SET username = ?, tag = ? WHERE discord_id = ?',
      [username, tag, discordUserId],
      (err, result) => {
        if (err) {
          console.error('Error executing query:', err);
          return;
        }

        console.log(`User: ${username}#${tag} updated with username and tag`);
      }
    );
  }
});

});

bot.on('messageCreate', (msg) => {
  if (!msg.content.startsWith(PREFIX) || msg.author.bot) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Function to check if two dates are the same day
  function isSameDay(date1, date2) {
    if (!date1 || !date2) {
      return false;
    }

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  // Command
  // Registration command logic
  if (command === 'register') {
    const discordUserId = msg.author.id;
    const username = msg.author.username;
    const tag = msg.author.discriminator;

    // Check if user is already registered
    con.query('SELECT * FROM users WHERE discord_id = ?', [discordUserId], (err, rows) => {
      if (err) {
        console.error('Error executing query:', err);
        return;
      }

      if (rows.length > 0) {
        const userData = rows[0];
        const id = userData.id;
        const storedUsername = userData.username;
        const storedTag = userData.tag;

        if (id) {
          // User is already registered with an ID
          const embed = new EmbedBuilder()
            .setTitle('**You are already registered. :no_entry_sign:**')
            .setColor('#ff0000');
          msg.reply({ embeds: [embed] });
        } else {
          // User is registered but does not have an ID
          if (username !== storedUsername || tag !== storedTag) {
            // Update the username and tag in the database
            con.query(
              'UPDATE users SET username = ?, tag = ? WHERE discord_id = ?',
              [username, tag, discordUserId],
              (err, result) => {
                if (err) {
                  console.error('Error executing query:', err);
                  return;
                }

                console.log(`User: ${username}#${tag} updated with username and tag`);
                const embed = new EmbedBuilder()
                  .setTitle('**Register Updated! :white_check_mark:**')
                  .setDescription('Your username and tag have been updated.')
                  .setColor('#00ff00');
                msg.reply({ embeds: [embed] });
              }
            );
          } else {
            const embed = new EmbedBuilder()
              .setTitle('**You are already registered. :no_entry_sign:**')
              .setColor('#ff0000');
            msg.reply({ embeds: [embed] });
          }
        }
      } else {
        // User is not registered, perform registration
        con.query('SELECT MAX(id) AS maxId FROM users', (err, result) => {
          if (err) {
            console.error('Error executing query:', err);
            return;
          }

          const maxId = result[0].maxId || 0;
          const id = maxId + 1;

          con.query(
            'INSERT INTO users (discord_id, username, tag, id) VALUES (?, ?, ?, ?)',
            [discordUserId, username, tag, id],
            (err, result) => {
              if (err) {
                console.error('Error executing query:', err);
                return;
              }

              console.log(`User: ${username}#${tag} registered successfully with ID: ${id}`);
              const embed = new EmbedBuilder()
                .setTitle('**Registration successful! :white_check_mark:**')
                .setDescription(`Your ID is: ${id}`)
                .setColor('#00ff00');
              msg.reply({ embeds: [embed] });
            }
          );
        });
      }
    });
  }
  else if(command === 'ping'){
    msg.reply('Pong!')
    console.log(`Author: ${msg.author.username}#${msg.author.discriminator}`)
    console.log(`Client: Pong!`)
  }
  else if (command === 'profile') {
    const discordUserId = msg.author.id;

    // Retrieve user's data from the database
    con.query('SELECT * FROM users WHERE discord_id = ?', [discordUserId], (err, rows) => {
      if (err) {
        console.error('Error executing query:', err);
        return;
      }

      if (rows.length === 0) {
        // User is not registered
        msg.reply('You are not registered yet. Use the `register` command to register.');
      } else {
        const userData = rows[0];
        const { discord_id, username, tag, wallet, id } = userData;
        const wallets = wallet.toLocaleString('en-US')

        // Reply with the user's data
        const embed = new EmbedBuilder()
          .setTitle(`**${msg.author.username}#${msg.author.discriminator} Info :information_source:**`)
          .setDescription(`**Username : ${msg.author.username}\nTag : ${msg.author.discriminator}\nUser ID : ${id}**`)
          .setFields({name: 'Your Wallet :moneybag:', value: `${wallets}`})
          .setColor('#00ffff')

        msg.reply({embeds: [embed]})

        console.log(`Someone use command (!${command}) : ${msg.author.username}#${msg.author.discriminator}`)
      }
    });
  }
  else if (command === 'embeds') {
    // Create a new MessageEmbed
    const embed = new EmbedBuilder()
      .setTitle('This is a Title')
      .setDescription('This is a description of the message.')
      .setColor('#0099ff')
      .addFields({name: 'Field 1', value: 'Value 1'})
      .addFields({name: 'Field 2', value: 'Value 2'})
      .setTimestamp();

    // Reply with the MessageEmbed
    msg.reply({ embeds: [embed] });
  }
  else if (command === 'bet') {
    const discordUserId = msg.author.id;
    const betAmount = parseFloat(args[0]);

    if (isNaN(betAmount) || betAmount <= 0) {
      msg.reply('Invalid bet amount. Please provide a valid number greater than 0.');
      return;
    }

    // Retrieve user's data from the database
    con.query('SELECT * FROM users WHERE discord_id = ?', [discordUserId], (err, rows) => {
      if (err) {
        console.error('Error executing query:', err);
        return;
      }

      if (rows.length === 0) {
        // User is not registered
        msg.reply('You are not registered yet. Use the `register` command to register.');
      } else {
        const userData = rows[0];
        const { discord_id, username, tag, wallet } = userData;

        if (wallet < betAmount) {
          msg.reply('Insufficient balance in your wallet.');
        } else {
          // Generate a random number between 0 and 1
          const randomNumber = Math.random();

          if (randomNumber >= 0.5) {
            // Win the bet
            const winnings = betAmount * 1;
            const newWallet = wallet + winnings;
            const formattedWinnings = winnings.toLocaleString('en-US');
            const formattedNewWallet = newWallet.toLocaleString('en-US');

            // Update the user's wallet in the database
            con.query('UPDATE users SET wallet = ? WHERE discord_id = ?', [newWallet, discordUserId], (err, result) => {
              if (err) {
                console.error('Error executing query:', err);
                return;
              }

              const embed = new EmbedBuilder()
                .setTitle('**Bet Result: WIN! :moneybag:**')
                .setDescription('Congratulations, you won your bet!')
                .addFields({ name: 'Bet Amount', value: `${betAmount.toLocaleString('en-US')}` })
                .addFields({ name: 'Winnings', value: `${formattedWinnings}` })
                .addFields({ name: 'New Wallet Balance', value: `${formattedNewWallet}` })
                .setColor('#00ff00');

              msg.reply({ embeds: [embed] });
            });
          } else {
            // Lose the bet
            const newWallet = wallet - betAmount;
            const formattedNewWallet = newWallet.toLocaleString('en-US');

            // Update the user's wallet in the database
            con.query('UPDATE users SET wallet = ? WHERE discord_id = ?', [newWallet, discordUserId], (err, result) => {
              if (err) {
                console.error('Error executing query:', err);
                return;
              }

              const embed = new EmbedBuilder()
                .setTitle('**Bet Result: LOSE! :x:**')
                .setDescription('Sorry, you lost your bet.')
                .addFields({ name: 'Bet Amount', value: `${betAmount.toLocaleString('en-US')}` })
                .addFields({ name: 'New Wallet Balance', value: `${formattedNewWallet}` })
                .setColor('#ff0000');

              msg.reply({ embeds: [embed] });
            });
          }
        }
      }
    });
  }
  else if (command === 'help') {
    // Generate the help message
    const embed = new EmbedBuilder()
      .setTitle('**Command List :question:**')
      .setDescription('PREFIX: !')
      .setColor('#00ffff');

    commands.forEach((cmd) => {
      embed.addFields({name: `${cmd.emote} ${cmd.name}`,value: `${cmd.description}`});
    });

    msg.reply({ embeds: [embed] });
  }
  else if (command === 'balance' || command === 'bal') {
    const discordUserId = msg.author.id;

    con.query('SELECT * FROM users WHERE discord_id = ?', [discordUserId], (err, rows) => {
      if (err) {
        console.log('Error executing query:', err)
        return;
      }

      if (rows.length === 0) {
        // User is not registered
        msg.reply('You are not registered yet. Use the `register` command to register.');
      } else {
        const userData = rows[0];
        const { discord_id, username, tag, wallet } = userData;
        const wallets = wallet.toLocaleString('en-US');

        const embed = new EmbedBuilder()
          .setTitle(`:money_with_wings: | ${msg.author.username}, you currently have **__${wallets}__ balance!**`)
          .setColor('#00ffff')

        msg.channel.send({embeds: [embed]})
      }

    })
  }
  else if (command === 'give') {
    const senderId = msg.author.id;
    const senderTag = msg.author.tag;
    const receiverMention = args[0];
    const amount = parseFloat(args[1]);

    if (!receiverMention || isNaN(amount) || amount <= 0) {
      msg.reply('Invalid command format. Please use `!give <@user> <amount>`.');
      return;
    }

    const receiverId = receiverMention.replace(/[\\<>@!]/g, '');

    // Retrieve sender's data from the database
    con.query('SELECT * FROM users WHERE discord_id = ?', [senderId], (err, senderRows) => {
      if (err) {
        console.error('Error executing query:', err);
        return;
      }

      if (senderRows.length === 0) {
        msg.reply('You are not registered yet. Use the `register` command to register.');
        return;
      }

      const senderData = senderRows[0];
      const senderWallet = senderData.wallet;

      if (senderWallet < amount) {
        msg.reply('Insufficient balance in your wallet.');
        return;
      }

      // Retrieve receiver's data from the database based on the Discord ID
      con.query('SELECT * FROM users WHERE discord_id = ?', [receiverId], (err, receiverRows) => {
        if (err) {
          console.error('Error executing query:', err);
          return;
        }

        if (receiverRows.length === 0) {
          msg.reply('User not found. Make sure to mention a valid user.');
          return;
        }

        const receiverData = receiverRows[0];

        // Confirmation message with buttons
        const confirmationEmbed = new EmbedBuilder()
          .setTitle('Confirm Wallet Transfer')
          .setDescription(`Transfer ${amount.toLocaleString('en-US')} from ${msg.author.tag} to ${receiverMention}?`)
          .setColor('#00ffff')
          .setTimestamp();

        const confirmButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel('Confirm')
          .setCustomId('confirmTransfer');

        const cancelButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel('Cancel')
          .setCustomId('cancelTransfer');

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        msg.reply({
          embeds: [confirmationEmbed],
          components: [row],
        }).then((confirmationMsg) => {
          const filter = (interaction) => interaction.isButton() && interaction.user.id === senderId;
          const collector = confirmationMsg.createMessageComponentCollector({ filter, time: 10000 });

          collector.on('collect', async (interaction) => {
            const { customId } = interaction;

            if (customId === 'confirmTransfer') {
              if (interaction.user.id !== senderId) {
                // Interaction is not from the sender, handle the error
                interaction.reply("Cannot confirm the transfer on behalf of another user.");
                return;
              }

              // Perform wallet transfer
              const newSenderWallet = senderWallet - amount;
              const newReceiverWallet = receiverData.wallet + amount;

              // Update sender's wallet in the database
              con.query('UPDATE users SET wallet = ? WHERE discord_id = ?', [newSenderWallet, senderId], (err) => {
                if (err) {
                  console.error('Error updating sender wallet:', err);
                  return;
                }
              });

              // Update receiver's wallet in the database
              con.query('UPDATE users SET wallet = ? WHERE discord_id = ?', [newReceiverWallet, receiverId], (err) => {
                if (err) {
                  console.error('Error updating receiver wallet:', err);
                  return;
                }
              });

              const successEmbed = new EmbedBuilder()
                .setTitle('Wallet Transfer Successful')
                .setDescription(`${amount.toLocaleString('en-US')} has been transferred from ${senderTag} to ${receiverMention}.`)
                .setColor('#00ff00')
                .setTimestamp();

              interaction.reply({ embeds: [successEmbed], ephemeral: true }).catch(console.error);
            } else if (customId === 'cancelTransfer') {
              if (interaction.user.id !== senderId) {
                // Interaction is not from the sender, handle the error
                interaction.reply("Cannot cancel the transfer on behalf of another user.");
                return;
              }

              const cancelEmbed = new EmbedBuilder()
                .setTitle('Wallet Transfer Cancelled')
                .setDescription('The wallet transfer has been cancelled.')
                .setColor('#ff0000')
                .setTimestamp();

              interaction.reply({ embeds: [cancelEmbed], ephemeral: true }).catch(console.error);
            }
          });

          collector.on('end', () => {
            // Remove buttons after the collector ends
            confirmationMsg.edit({ components: [] }).catch(console.error);
          });
        }).catch(console.error);
      });
    });
  }
  else if (command === 'daily') {
    const discordUserId = msg.author.id;

    // Check if user has already claimed the daily reward today
    const currentDate = new Date();
    const currentDay = currentDate.getUTCDate();

    const lastClaimDate = lastClaimDates.get(discordUserId);

    // Check if the last claim date is the same as the current date
    if (lastClaimDate && isSameDay(lastClaimDate, currentDate)) {
      // User has already claimed the daily reward today
      msg.reply('You have already claimed your daily reward today. Please try again tomorrow.');
    } else {
      // Generate a random reward amount between 60000 and 100000
      const reward = Math.floor(Math.random() * (100000 - 60000 + 1)) + 60000;

      const formattedCurrentDate = currentDate.toISOString().split('T')[0];

      // Update the user's wallet with the reward
      con.query(
        'UPDATE users SET wallet = wallet + ? WHERE discord_id = ?',
        [reward, discordUserId],
        (err, result) => {
          if (err) {
            console.error('Error executing query:', err);
            return;
          }

          const formattedReward = reward.toLocaleString('en-US');

          const embed = new EmbedBuilder()
            .setTitle('**Daily Reward Claimed! :money_with_wings:**')
            .setDescription(`**:moneybag: | You have claimed a daily reward of __${formattedReward}__ balance!**`)
            .setColor('#00ff00');

          msg.reply({ embeds: [embed] });

          // Update the last claim date in the map
          lastClaimDates.set(discordUserId, currentDate);

          // Save the lastClaimDates map to a file
          saveLastClaimDates();
        }
      );
    }
  }


});

process.on('beforeExit', () => {
  // Save the lastClaimDates map before the application exits
  saveLastClaimDates();
});

bot.login(process.env.DISCORD_TOKEN_2);
