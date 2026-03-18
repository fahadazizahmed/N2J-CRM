FROM node:22

ENV USER=nodejs
ENV USERID=6100
ENV GROUP=nodejs
ENV GROUPID=6100

# Create app directory
WORKDIR /home/$USER/app

# Add local user for security
RUN groupadd -g $USERID $USER
RUN useradd -g $USERID -l -m -s /bin/false -u $GROUPID $GROUP
RUN chown -R $USER:$GROUP /home/$USER

USER $USER

# Copy package.json with proper ownership
COPY --chown=$USER:$GROUP package.json .

# Removed --production because ts-node is a dev dependency needed for the start command
RUN npm install --quiet

# Bundle app source with proper ownership
COPY --chown=$USER:$GROUP . .

# Start Node server
CMD ["npm", "start"]
