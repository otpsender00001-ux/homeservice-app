FROM php:8.2-apache

# I-enable ang URL rewrite module ng Apache
RUN a2enmod rewrite

# Install PHP extensions para sa MySQL
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Kopyahin ang mga files ng project mo
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# I-configure ang PORT para sa Railway
ENV PORT=8080
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

EXPOSE ${PORT}

CMD ["apache2-foreground"]