FROM php:8.2-apache

# Disable all MPM modules first
RUN a2dismod mpm_event mpm_worker mpm_prefork || true

# Enable only prefork and rewrite
RUN a2enmod mpm_prefork rewrite

# Install PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copy project files
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]