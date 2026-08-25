FROM php:8.2-apache

# Install PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable URL rewriting
RUN a2enmod rewrite

# Copy project files
COPY . /var/www/html/

# Copy startup script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Make startup script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Permissions
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

EXPOSE 80

# Start using our runtime fix
CMD ["/usr/local/bin/docker-entrypoint.sh"]