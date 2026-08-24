FROM php:8.2-apache

# Disable any MPM that may conflict, then enable prefork
RUN a2dismod mpm_event mpm_worker || true \
    && a2enmod mpm_prefork \
    && a2enmod rewrite

# Install PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copy project files
COPY . /var/www/html/

# Permissions
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# Railway uses the PORT environment variable.
# Apache listens on 80 inside the container.
EXPOSE 80

CMD ["apache2-foreground"]